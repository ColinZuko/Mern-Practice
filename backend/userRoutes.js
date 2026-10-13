const express = require('express');
const database = require('./connect');
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, 'config.env') });

let userRoutes = express.Router();
const SALT_ROUNDS = 6;

// Never send password hashes back to the client
const HIDE_PASSWORD = { projection: { password: 0 } };

//#1 - Retrieve all users
userRoutes.route("/users").get(verifyToken, async (request, response) => {
    let db = database.getDb();
    let data = await db.collection("users").find({}, HIDE_PASSWORD).toArray();
    if (data.length > 0) {
        response.json(data);
    }else {
        throw new Error("No users found");
    }
});

//#2 - Retrieve a user
userRoutes.route("/users/:id").get(verifyToken, async (request, response) => {
    if (!ObjectId.isValid(request.params.id)) {
        return response.status(400).json({ message: "Invalid user ID format" });
    }
    let db = database.getDb();
    let data = await db.collection("users").findOne({ _id: new ObjectId(request.params.id)}, HIDE_PASSWORD);
    if (data) {
        response.json(data);
    }else {
        response.status(404).json({ message: "User not found" });
    }
});

//#3 - Create a user
userRoutes.route("/users").post(async (request, response) => {
    let db = database.getDb();

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
                const token = jwt.sign( { _id: user._id, email: user.email, name: user.name, joinDate: user.joinDate } , process.env.SECRETKEY, { expiresIn: '1h' });
            response.json({ success: true, token });
        }else { 
            // Same message for both cases so the login form can't be used to discover which emails have accounts
            response.json({ success: false, message: "Invalid email or password" });
        }
    }else{
        response.json({ success: false, message: "Invalid email or password" });
    }

});

function verifyToken(request, response, next) {
    const authHeaders = request.headers["authorization"];
    const token = authHeaders && authHeaders.split(" ")[1];
    if (!token) {
        return response.status(401).json({ message: "Authentication token is missing" });
    }

    jwt.verify(token, process.env.SECRETKEY, (error, user) => {
        if (error) {
            return response.status(403).json({ message: "Invalid authentication token" });
        }
        request.user = user;
        next();
    });
}

module.exports = userRoutes;
