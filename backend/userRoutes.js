const express = require('express');
const database = require('./connect');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ROLES, verifyToken, requireRole } = require('./auth');
require('dotenv').config({ path: require('path').join(__dirname, 'config.env') });

let userRoutes = express.Router();
const SALT_ROUNDS = 6;

// Never send password hashes back to the client
const HIDE_PASSWORD = { projection: { password: 0 } };

function withRole(user) {
    return { ...user, role: user.role || "user", saved: user.saved || [] };
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
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { saved: 1 } });
    if (!user) {
        return response.status(404).json({ message: "User not found" });
    }

    const alreadySaved = (user.saved || []).includes(postId);
    const update = alreadySaved ? { $pull: { saved: postId } } : { $addToSet: { saved: postId } };
    await db.collection("users").updateOne({ _id: userId }, update);

    const updated = await db.collection("users").findOne({ _id: userId }, { projection: { saved: 1 } });
    response.json({ saved: updated.saved || [] });
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
            saved: [],
            posts: []
        };
        let data = await db.collection("users").insertOne(mongoObject);
        response.json(data);
    }
});

//#4 - Update a user (only your own account)
userRoutes.route("/users/:id").put(verifyToken, async (request, response) => {
    if (request.user._id !== request.params.id) {
        return response.status(403).json({ message: "Unauthorized to update this user" });
    }
    let db = database.getDb();
    let changes = {};
    if (request.body.name) changes.name = request.body.name;
    if (request.body.email) changes.email = request.body.email;
    if (request.body.password) changes.password = await bcrypt.hash(request.body.password, SALT_ROUNDS);
    let data = await db.collection("users").updateOne({_id: new ObjectId(request.params.id)}, { $set: changes });
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
    let data = await db.collection("users").updateOne({ _id: new ObjectId(request.params.id) }, { $set: { role } });
    if (data.matchedCount === 0) {
        return response.status(404).json({ message: "User not found" });
    }
    response.json({ success: true, role });
});

//#5 - Delete a user (only your own account)
userRoutes.route("/users/:id").delete(verifyToken, async (request, response) => {
    if (request.user._id !== request.params.id) {
        return response.status(403).json({ message: "Unauthorized to delete this user" });
    }
    let db = database.getDb();
    let data = await db.collection("users").deleteOne({ _id: new ObjectId(request.params.id)});
    response.json(data);
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
