const express = require('express');
const database = require('./connect');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ROLES, verifyToken, requireRole } = require('./auth');
const { createVerificationToken, createResetToken, hashToken, sendVerificationEmail, sendPasswordResetEmail } = require('./email');
const { loginLimiter, signupLimiter, verifyEmailLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('./limits');
require('dotenv').config({ path: require('path').join(__dirname, 'config.env') });

let userRoutes = express.Router();
// 12 rounds is the current recommendation; older hashes (6 rounds) are upgraded at the next login
const SALT_ROUNDS = 12;
// Compared against when an email doesn't exist, so failed logins take the same time either way
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

// Inputs must be plain strings: an object like { "$ne": null } would otherwise be run as a database query
function cleanString(value, maxLength) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Email addresses aren't case-sensitive: "Colin@x.com" and "colin@x.com" are the same account.
// New addresses are stored in lowercase; this makes lookups also match older mixed-case ones.
const ANY_CASE = { collation: { locale: "en", strength: 2 } };
// Same rule as the sign-up form: 6+ characters with an uppercase letter, a number and a symbol
function passwordProblem(password) {
    if (typeof password !== "string" || password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 72) return "Password can be at most 72 characters";
    if (!/[A-Z]/.test(password) || !/\d/.test(password) || !/[\W_]/.test(password)) {
        return "Password must contain an uppercase letter, a number and a symbol";
    }
    return null;
}

// Never send password hashes or verification tokens back to the client
const HIDE_PASSWORD = { projection: { password: 0, verifyTokenHash: 0, verifyTokenExpires: 0, resetTokenHash: 0, resetTokenExpires: 0 } };
const RESEND_COOLDOWN_MS = 60 * 1000;
const FORMER_CONTRIBUTOR = "Former contributor";

// Accounts created before email verification existed have no flag and count as verified
function isVerified(user) {
    return user.emailVerified !== false;
}

function withRole(user) {
    return { ...user, role: user.role || "user", saved: user.saved || [], liked: user.liked || [], emailVerified: isVerified(user) };
}

// Stores a fresh verification token for the user and emails them the link.
// Returns true if the email was sent; the account works either way and they can resend.
async function startVerification(db, user) {
    const { token, hash, expires } = createVerificationToken();
    await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { emailVerified: false, verifyTokenHash: hash, verifyTokenExpires: expires, verificationSentAt: new Date() } }
    );
    try {
        return await sendVerificationEmail({ to: user.email, name: user.name, token });
    } catch (error) {
        console.error("Sending verification email failed:", error);
        return false;
    }
}

//#1 - Retrieve all users - admins only (for the role management page)
userRoutes.route("/users").get(requireRole("admin"), async (request, response) => {
    let db = database.getDb();
    let data = await db.collection("users").find({}, HIDE_PASSWORD).sort({ joinDate: 1 }).toArray();
    response.json(data.map(withRole));
});

//#1b - The logged-in user's own account, with their current role and saved recipes
userRoutes.route("/users/me").get(verifyToken, async (request, response) => {
    if (!ObjectId.isValid(request.user._id)) {
        return response.status(401).json({ message: "Invalid account" });
    }
    let db = database.getDb();
    let data = await db.collection("users").findOne({ _id: new ObjectId(request.user._id) }, HIDE_PASSWORD);
    if (data) {
        response.json(withRole(data));
    } else {
        response.status(404).json({ message: "User not found" });
    }
});

//#1c - Save or un-save a recipe for the logged-in user
userRoutes.route("/users/me/saved/:postId").post(verifyToken, async (request, response) => {
    const postId = request.params.postId;
    if (!ObjectId.isValid(postId) || !ObjectId.isValid(request.user._id)) {
        return response.status(400).json({ message: "Invalid ID format" });
    }
    let db = database.getDb();
    const userId = new ObjectId(request.user._id);
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { saved: 1, emailVerified: 1 } });
    if (!user) {
        return response.status(404).json({ message: "User not found" });
    }
    if (!isVerified(user)) {
        return response.status(403).json({ message: "Please confirm your email address to save recipes" });
    }

    const alreadySaved = (user.saved || []).includes(postId);
    const update = alreadySaved ? { $pull: { saved: postId } } : { $addToSet: { saved: postId } };
    await db.collection("users").updateOne({ _id: userId }, update);

    const updated = await db.collection("users").findOne({ _id: userId }, { projection: { saved: 1 } });
    response.json({ saved: updated.saved || [] });
});

//#1c2 - Download everything the site stores about you (GDPR right of access / portability)
userRoutes.route("/users/me/export").get(verifyToken, async (request, response) => {
    if (!ObjectId.isValid(request.user._id)) {
        return response.status(401).json({ message: "Invalid account" });
    }
    let db = database.getDb();
    const user = await db.collection("users").findOne(
        { _id: new ObjectId(request.user._id) },
        { projection: { password: 0, verifyTokenHash: 0, verifyTokenExpires: 0, resetTokenHash: 0, resetTokenExpires: 0 } }
    );
    if (!user) {
        return response.status(404).json({ message: "User not found" });
    }

    const userId = String(user._id);
    const idsToObjectIds = (ids) => (ids || []).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const titles = async (ids) =>
        (await db.collection("posts").find({ _id: { $in: idsToObjectIds(ids) } }, { projection: { title: 1 } }).toArray())
            .map((p) => ({ id: String(p._id), title: p.title }));

    const comments = await db.collection("comments").find({ author: userId }).sort({ dateCreated: 1 }).toArray();
    const commentPosts = await titles([...new Set(comments.map((c) => c.postId))]);
    const recipes = await db.collection("posts")
        .find({ author: userId }, { projection: { title: 1, description: 1, dateCreated: 1, dateUpdated: 1 } })
        .toArray();

    const data = {
        exportedAt: new Date(),
        account: {
            id: userId,
            name: user.name,
            email: user.email,
            joinDate: user.joinDate,
            role: user.role || "user",
            emailVerified: isVerified(user),
            emailVerifiedAt: user.emailVerifiedAt,
            passwordChangedAt: user.passwordChangedAt,
        },
        savedRecipes: await titles(user.saved),
        likedRecipes: await titles(user.liked),
        comments: comments.map((c) => ({
            recipe: commentPosts.find((p) => p.id === c.postId)?.title || "(deleted recipe)",
            text: c.text,
            date: c.dateCreated,
        })),
        publishedRecipes: recipes.map((r) => ({ id: String(r._id), title: r.title, description: r.description, published: r.dateCreated, updated: r.dateUpdated })),
    };

    response.set("Content-Disposition", 'attachment; filename="pickle-and-pan-my-data.json"');
    response.json(data);
});

//#1d - Confirm an email address with the token from the verification link
userRoutes.route("/users/verify-email").post(verifyEmailLimiter, async (request, response) => {
    const token = request.body.token;
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
        return response.status(400).json({ message: "This verification link is invalid." });
    }
    let db = database.getDb();
    const user = await db.collection("users").findOne({ verifyTokenHash: hashToken(token) });
    if (!user) {
        return response.status(400).json({ message: "This verification link is invalid or has already been used." });
    }
    if (user.verifyTokenExpires < new Date()) {
        return response.status(400).json({ message: "This verification link has expired.", expired: true });
    }
    await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { emailVerified: true, emailVerifiedAt: new Date() }, $unset: { verifyTokenHash: "", verifyTokenExpires: "" } }
    );
    response.json({ success: true, email: user.email });
});

//#1e - Send the verification email again (at most once a minute)
userRoutes.route("/users/me/resend-verification").post(verifyToken, async (request, response) => {
    if (!ObjectId.isValid(request.user._id)) {
        return response.status(401).json({ message: "Invalid account" });
    }
    let db = database.getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(request.user._id) });
    if (!user) {
        return response.status(404).json({ message: "User not found" });
    }
    if (isVerified(user)) {
        return response.status(400).json({ message: "Your email address is already confirmed." });
    }
    if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) {
        return response.status(429).json({ message: "We just sent an email. Please wait a minute before asking for another." });
    }
    const sent = await startVerification(db, user);
    if (!sent) {
        return response.status(502).json({ message: "We couldn't send the email right now. Please try again later." });
    }
    response.json({ success: true });
});

//#1f - Forgot password: email a reset link. Always gives the same answer, so it can't be
// used to find out which email addresses have an account.
const RESET_RESPONSE = { success: true, message: "If an account exists for that email, we've sent a link to reset the password." };
userRoutes.route("/users/forgot-password").post(forgotPasswordLimiter, async (request, response) => {
    const email = cleanString(request.body.email, 100);
    if (!email || !EMAIL_PATTERN.test(email)) {
        return response.status(400).json({ message: "Please enter a valid email address" });
    }
    let db = database.getDb();
    const user = await db.collection("users").findOne({ email }, { ...ANY_CASE, projection: { name: 1, email: 1, resetSentAt: 1 } });

    // At most one email a minute per account; extra requests quietly get the same answer
    const recentlySent = user?.resetSentAt && Date.now() - user.resetSentAt.getTime() < RESEND_COOLDOWN_MS;
    if (user && !recentlySent) {
        const { token, hash, expires } = createResetToken();
        await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { resetTokenHash: hash, resetTokenExpires: expires, resetSentAt: new Date() } }
        );
        try {
            await sendPasswordResetEmail({ to: user.email, name: user.name, token });
        } catch (error) {
            console.error("Sending password reset email failed:", error);
        }
    }
    response.json(RESET_RESPONSE);
});

//#1g - Reset password with the token from the email link
userRoutes.route("/users/reset-password").post(resetPasswordLimiter, async (request, response) => {
    const token = request.body.token;
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
        return response.status(400).json({ message: "This reset link is invalid." });
    }
    const problem = passwordProblem(request.body.password);
    if (problem) {
        return response.status(400).json({ message: problem });
    }
    let db = database.getDb();
    const user = await db.collection("users").findOne({ resetTokenHash: hashToken(token) });
    if (!user) {
        return response.status(400).json({ message: "This reset link is invalid or has already been used." });
    }
    if (user.resetTokenExpires < new Date()) {
        return response.status(400).json({ message: "This reset link has expired. Please ask for a new one.", expired: true });
    }

    const hash = await bcrypt.hash(request.body.password, SALT_ROUNDS);
    await db.collection("users").updateOne(
        { _id: user._id },
        {
            // Opening the emailed link also proves the address belongs to them
            $set: { password: hash, passwordChangedAt: new Date(), emailVerified: true },
            $unset: { resetTokenHash: "", resetTokenExpires: "", verifyTokenHash: "", verifyTokenExpires: "" },
        }
    );
    response.json({ success: true, email: user.email });
});

//#2 - Public author profile (no email or other private details)
userRoutes.route("/users/:id").get(async (request, response) => {
    if (!ObjectId.isValid(request.params.id)) {
        return response.status(400).json({ message: "Invalid user ID format" });
    }
    let db = database.getDb();
    let data = await db.collection("users").findOne(
        { _id: new ObjectId(request.params.id) },
        { projection: { name: 1, joinDate: 1, role: 1 } }
    );
    if (data) {
        response.json({ ...data, role: data.role || "user" });
    }else {
        response.status(404).json({ message: "User not found" });
    }
});

//#3 - Create a user (everyone signs up as a reader; admins promote people to editor)
userRoutes.route("/users").post(signupLimiter, async (request, response) => {
    let db = database.getDb();

    const name = cleanString(request.body.name, 40);
    const email = cleanString(request.body.email, 100).toLowerCase();
    if (!name || !email) {
        return response.status(400).json({ message: "Name, email and password are required" });
    }
    if (!EMAIL_PATTERN.test(email)) {
        return response.status(400).json({ message: "Please enter a valid email address" });
    }
    const problem = passwordProblem(request.body.password);
    if (problem) {
        return response.status(400).json({ message: problem });
    }

    const takenEmail = await db.collection("users").findOne({ email }, ANY_CASE);

    if (takenEmail) {
        response.status(400).json({ message: "Email is already in use" });
    }else {
        const hash = await bcrypt.hash(request.body.password, SALT_ROUNDS);

        let mongoObject = {
            name,
            email,
            password: hash,
            joinDate: new Date(),
            role: "user",
            emailVerified: false,
            saved: [],
            posts: []
        };
        let data = await db.collection("users").insertOne(mongoObject);
        const emailSent = await startVerification(db, { ...mongoObject, _id: data.insertedId });
        response.json({ ...data, emailSent });
    }
});

//#4 - Update a user (only your own account)
userRoutes.route("/users/:id").put(verifyToken, async (request, response) => {
    if (request.user._id !== request.params.id) {
        return response.status(403).json({ message: "Unauthorized to update this user" });
    }
    let db = database.getDb();
    const userId = new ObjectId(request.params.id);
    const current = await db.collection("users").findOne({ _id: userId }, { projection: { email: 1, name: 1 } });
    if (!current) {
        return response.status(404).json({ message: "User not found" });
    }

    let changes = {};
    const name = cleanString(request.body.name, 40);
    const email = cleanString(request.body.email, 100).toLowerCase();
    if (name) changes.name = name;
    const emailChanged = !!email && email !== current.email.toLowerCase();
    if (emailChanged) {
        if (!EMAIL_PATTERN.test(email)) {
            return response.status(400).json({ message: "Please enter a valid email address" });
        }
        if (await db.collection("users").findOne({ email, _id: { $ne: userId } }, ANY_CASE)) {
            return response.status(400).json({ message: "Email is already in use" });
        }
        changes.email = email;
    }
    if (request.body.password !== undefined) {
        const problem = passwordProblem(request.body.password);
        if (problem) return response.status(400).json({ message: problem });
        changes.password = await bcrypt.hash(request.body.password, SALT_ROUNDS);
    }
    if (Object.keys(changes).length === 0) {
        return response.status(400).json({ message: "Nothing to update" });
    }
    let data = await db.collection("users").updateOne({ _id: userId }, { $set: changes });

    // A new email address has to be confirmed again
    if (emailChanged) {
        await startVerification(db, { _id: userId, email: changes.email, name: changes.name || current.name });
    }
    response.json(data);
});

//#4b - Change a user's role - admins only
userRoutes.route("/users/:id/role").patch(requireRole("admin"), async (request, response) => {
    const role = request.body.role;
    if (!ROLES.includes(role)) {
        return response.status(400).json({ message: `Role must be one of: ${ROLES.join(", ")}` });
    }
    if (!ObjectId.isValid(request.params.id)) {
        return response.status(400).json({ message: "Invalid user ID format" });
    }
    // Stops an admin from accidentally locking themselves out
    if (request.user._id === request.params.id) {
        return response.status(400).json({ message: "You can't change your own role" });
    }
    let db = database.getDb();
    const target = await db.collection("users").findOne({ _id: new ObjectId(request.params.id) }, { projection: { emailVerified: 1 } });
    if (!target) {
        return response.status(404).json({ message: "User not found" });
    }
    // Only people with a confirmed email can be given publishing rights
    if (role !== "user" && !isVerified(target)) {
        return response.status(400).json({ message: "This person needs to confirm their email before they can be an editor or admin" });
    }
    await db.collection("users").updateOne({ _id: target._id }, { $set: { role } });
    response.json({ success: true, role });
});

// Removes everything personal tied to an account (GDPR right to erasure):
// comments are deleted, likes are taken back, and published recipes stay online
// but are credited to "Former contributor" instead of the person's name.
async function removeAccount(db, user) {
    const userId = String(user._id);
    await db.collection("comments").deleteMany({ author: userId });
    const liked = (user.liked || []).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (liked.length) {
        await db.collection("posts").updateMany({ _id: { $in: liked }, likes: { $gt: 0 } }, { $inc: { likes: -1 } });
    }
    await db.collection("posts").updateMany({ author: userId }, { $set: { authorName: FORMER_CONTRIBUTOR } });
    return db.collection("users").deleteOne({ _id: user._id });
}

//#5 - Delete a user: your own account (with your password), or anyone's if you're an admin.
userRoutes.route("/users/:id").delete(verifyToken, async (request, response) => {
    if (!ObjectId.isValid(request.params.id) || !ObjectId.isValid(request.user._id)) {
        return response.status(400).json({ message: "Invalid user ID format" });
    }
    let db = database.getDb();
    const users = db.collection("users");
    const isSelf = request.user._id === request.params.id;

    // Check the role in the database, not the token, so a demoted admin can't still delete people
    const requester = await users.findOne({ _id: new ObjectId(request.user._id) }, { projection: { role: 1 } });
    if (!requester) {
        return response.status(401).json({ message: "Account no longer exists" });
    }
    if (!isSelf && requester.role !== "admin") {
        return response.status(403).json({ message: "Unauthorized to delete this user" });
    }

    const target = await users.findOne({ _id: new ObjectId(request.params.id) }, { projection: { role: 1, liked: 1, password: 1 } });
    if (!target) {
        return response.status(404).json({ message: "User not found" });
    }
    // Deleting your own account needs your password, so a forgotten open session can't do it
    if (isSelf) {
        const password = typeof request.body?.password === "string" ? request.body.password : "";
        if (!password || !(await bcrypt.compare(password, target.password))) {
            return response.status(401).json({ message: "That password isn't right" });
        }
    }
    // Never remove the last admin, or nobody could manage the site any more
    if (target.role === "admin" && (await users.countDocuments({ role: "admin" })) <= 1) {
        return response.status(400).json({ message: "You can't remove the only admin" });
    }

    let data = await removeAccount(db, target);
    response.json({ success: true, deletedCount: data.deletedCount });
});

//6 - Login
userRoutes.route("/users/login").post(loginLimiter, async (request, response) => {
    let db = database.getDb();

    const email = cleanString(request.body.email, 100);
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const user = email ? await db.collection("users").findOne({ email }, ANY_CASE) : null;

    // Always run a password check so failed logins take as long whether or not the email exists
    const confirmation = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (user) {
        if (confirmation) {
            // Upgrade older, weaker password hashes now that we know the password
            if (bcrypt.getRounds(user.password) < SALT_ROUNDS) {
                const stronger = await bcrypt.hash(password, SALT_ROUNDS);
                await db.collection("users").updateOne({ _id: user._id }, { $set: { password: stronger } });
            }
                // Only sign the fields you need, keeping the password hash out of the token
                const token = jwt.sign( { _id: user._id, email: user.email, name: user.name, joinDate: user.joinDate, role: user.role || "user" } , process.env.SECRETKEY, { expiresIn: '1h' });
            response.json({ success: true, token });
        }else {
            // Same message for both cases so the login form can't be used to discover which emails have accounts.
            // 401 also lets the rate limiter count this as a failed attempt.
            response.status(401).json({ success: false, message: "Invalid email or password" });
        }
    }else{
        response.status(401).json({ success: false, message: "Invalid email or password" });
    }

});

module.exports = userRoutes;
