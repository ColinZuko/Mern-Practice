const express = require('express');
const database = require('./connect');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ROLES, verifyToken, requireRole } = require('./auth');
const { createVerificationToken, hashToken, sendVerificationEmail } = require('./email');
require('dotenv').config({ path: require('path').join(__dirname, 'config.env') });

let userRoutes = express.Router();
const SALT_ROUNDS = 6;

// Never send password hashes or verification tokens back to the client
const HIDE_PASSWORD = { projection: { password: 0, verifyTokenHash: 0, verifyTokenExpires: 0 } };
const RESEND_COOLDOWN_MS = 60 * 1000;

// Accounts created before email verification existed have no flag and count as verified
function isVerified(user) {
    return user.emailVerified !== false;
}

function withRole(user) {
    return { ...user, role: user.role || "user", saved: user.saved || [], emailVerified: isVerified(user) };
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

//#1d - Confirm an email address with the token from the verification link
userRoutes.route("/users/verify-email").post(async (request, response) => {
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
userRoutes.route("/users").post(async (request, response) => {
    let db = database.getDb();

    if (!request.body.email || !request.body.password || !request.body.name) {
        return response.status(400).json({ message: "Name, email and password are required" });
    }

    const takenEmail = await db.collection("users").findOne({ email: request.body.email });

    if (takenEmail) {
        response.status(400).json({ message: "Email is already in use" });
    }else {
        const hash = await bcrypt.hash(request.body.password, SALT_ROUNDS);

        let mongoObject = {
            name: request.body.name,
            email: request.body.email,
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
    if (request.body.name) changes.name = request.body.name;
    const emailChanged = !!request.body.email && request.body.email !== current.email;
    if (emailChanged) {
        if (await db.collection("users").findOne({ email: request.body.email })) {
            return response.status(400).json({ message: "Email is already in use" });
        }
        changes.email = request.body.email;
    }
    if (request.body.password) changes.password = await bcrypt.hash(request.body.password, SALT_ROUNDS);
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

//#5 - Delete a user: your own account, or anyone's if you're an admin.
// Their recipes stay published under their name; admins can remove those separately.
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

    const target = await users.findOne({ _id: new ObjectId(request.params.id) }, { projection: { role: 1 } });
    if (!target) {
        return response.status(404).json({ message: "User not found" });
    }
    // Never remove the last admin, or nobody could manage the site any more
    if (target.role === "admin" && (await users.countDocuments({ role: "admin" })) <= 1) {
        return response.status(400).json({ message: "You can't remove the only admin" });
    }

    let data = await users.deleteOne({ _id: target._id });
    response.json({ success: true, deletedCount: data.deletedCount });
});

//6 - Login
userRoutes.route("/users/login").post(async (request, response) => {
    let db = database.getDb();

    const user = await db.collection("users").findOne({ email: request.body.email });

    if (user) {
        let confirmation = await bcrypt.compare(request.body.password, user.password);
        if (confirmation) {
                // Only sign the fields you need, keeping the password hash out of the token
                const token = jwt.sign( { _id: user._id, email: user.email, name: user.name, joinDate: user.joinDate, role: user.role || "user" } , process.env.SECRETKEY, { expiresIn: '1h' });
            response.json({ success: true, token });
        }else {
            // Same message for both cases so the login form can't be used to discover which emails have accounts
            response.json({ success: false, message: "Invalid email or password" });
        }
    }else{
        response.json({ success: false, message: "Invalid email or password" });
    }

});

module.exports = userRoutes;
