const express = require('express');
const database = require('./connect');
const ObjectId = require('mongodb').ObjectId;
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

let postRoutes = express.Router();

//#1 - Retrieve all posts
postRoutes.route("/posts").get(verifyToken, async (request, response) => {
    try {
        let db = database.getDb();
        let query = {};

        // CHANGED: Match if the single active filter exists inside the document's cuisines array
        if (request.query.cuisine) {
            query.cuisines = { $in: [request.query.cuisine.toLowerCase()] };
        }

        if (request.query.search) {
            query.$or = [
                { title: { $regex: request.query.search, $options: 'i' } },
                { description: { $regex: request.query.search, $options: 'i' } }
            ];
        }

        let data = await db.collection("posts").find(query).toArray();
        response.json(data || []);
    } catch (error) {
        response.status(500).json({ message: "Server error", error: error.message });
    }
});

// NEW: #1b - Retrieve top 6 trending/most viewed posts
// PLACED ABOVE /posts/:id TO PREVENT EXPRESS ROUTING CONFLICTS
postRoutes.route("/posts/trending").get(verifyToken, async (request, response) => {
    try {
        let db = database.getDb();
        // Sorts by views descending (-1) and pulls a maximum of 6 elements
        let data = await db.collection("posts")
            .find({})
            .sort({ views: -1 })
            .limit(6)
            .toArray();
            
        response.json(data);
    } catch (error) {
        console.error("Error fetching trending posts:", error);
        response.status(500).json({ success: false, error: error.message });
    }
});

//#2 - Retrieve a single post
postRoutes.route("/posts/:id").get(verifyToken, async (request, response) => {
    try {
        let db = database.getDb();
        let data = await db.collection("posts").findOne({ _id: new ObjectId(request.params.id)});
        if (data && Object.keys(data).length > 0) {
            response.json(data);
        } else {
            response.status(404).json({ message: "Post not found" });
        }
    } catch (error) {
        response.status(400).json({ message: "Invalid ID format" });
    }
});

//#3 - Create a post
postRoutes.route("/posts").post(verifyToken, async (request, response) => {
    try {
        let db = database.getDb();
        let mongoObject = {
            title: request.body.title,
            description: request.body.description,
            content: request.body.content,
            dateCreated: request.body.dateCreated,
            cuisines: Array.isArray(request.body.cuisines) ? request.body.cuisines : [], // Normalize for consistent querying
            imageId: request.body.imageId,
            author: request.body.author,
            authorName: request.body.authorName,
            views: 0 // Initialize tracking metrics on every new creation
        }; 
        let data = await db.collection("posts").insertOne(mongoObject);
        response.json(data);
    } catch (error) {
        console.error("Error creating post:", error);
        response.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

// NEW: #3b - Increment view count on a single post
// Uses $inc atomic operations to safely step count without reading first
postRoutes.route("/posts/:id/view").patch(verifyToken, async (request, response) => {
    try {
        let db = database.getDb();
        let data = await db.collection("posts").updateOne(
            { _id: new ObjectId(request.params.id) },
            { $inc: { views: 1 } }
        );
        
        if (data.matchedCount === 0) {
            return response.status(404).json({ message: "Post not found to log analytics" });
        }
        response.json({ success: true, message: "View metrics tracked successfully" });
    } catch (error) {
        console.error("Error logging analytics:", error);
        response.status(500).json({ success: false, error: error.message });
    }
});

//#4 - Update a post
postRoutes.route("/posts/:id").put(verifyToken, async (request, response) => {
    let db = database.getDb();
    let mongoObject = {
        $set: {
            title: request.body.title,
            description: request.body.description,
            content: request.body.content,
            author: request.body.author,
            dateCreated: request.body.dateCreated,
            imageId: request.body.imageId,
        }
    }; 
    let data = await db.collection("posts").updateOne({_id: new ObjectId(request.params.id)}, mongoObject);
    response.json(data);
});

//#5 - Delete a post
postRoutes.route("/posts/:id").delete(verifyToken, async (request, response) => {
    let db = database.getDb();
    let data = await db.collection("posts").deleteOne({ _id: new ObjectId(request.params.id)});
    response.json(data);
});

function verifyToken(request, response, next) {
    const authHeaders = request.headers['authorization'];
    const token = authHeaders && authHeaders.split(' ')[1];
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

module.exports = postRoutes;