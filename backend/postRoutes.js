const express = require("express");
const database = require("./connect");
const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "./config.env" });

let postRoutes = express.Router();

//#1 - Retrieve all posts (With Search & Plural Cuisine Filtering)
postRoutes.route("/posts").get(verifyToken, async (request, response) => {
  try {
    let db = database.getDb();
    let query = {};

    if (request.query.cuisine) {
      query.cuisines = { $in: [request.query.cuisine.toLowerCase()] };
    }

    if (request.query.search) {
      query.$or = [
        { title: { $regex: request.query.search, $options: "i" } },
        { description: { $regex: request.query.search, $options: "i" } },
      ];
    }

    let data = await db.collection("posts").find(query).toArray();
    response.json(data || []);
  } catch (error) {
    response
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

//#1b - Retrieve top 6 trending/most viewed posts
postRoutes
  .route("/posts/trending")
  .get(verifyToken, async (request, response) => {
    try {
      let db = database.getDb();
      let data = await db
        .collection("posts")
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

//#3 - Create a post
postRoutes.route("/posts").post(verifyToken, async (request, response) => {
  try {
    let db = database.getDb();
    let mongoObject = {
      title: request.body.title,
      description: request.body.description,
      content: request.body.content,
      dateCreated: request.body.dateCreated,
      cuisines: Array.isArray(request.body.cuisines)
        ? request.body.cuisines
        : [],
      imageId: request.body.imageId,
      author: request.body.author,
      authorName: request.body.authorName,
      views: 0,
    };
    let data = await db.collection("posts").insertOne(mongoObject);
    response.json(data);
  } catch (error) {
    console.error("Error creating post:", error);
    response
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

//#3b - Increment view count on a single post
postRoutes
  .route("/posts/:id/view")
  .patch(verifyToken, async (request, response) => {
    try {
      let db = database.getDb();
      let data = await db
        .collection("posts")
        .updateOne(
          { _id: new ObjectId(request.params.id) },
          { $inc: { views: 1 } },
        );

      if (data.matchedCount === 0) {
        return response
          .status(404)
          .json({ message: "Post not found to log analytics" });
      }
      response.json({
        success: true,
        message: "View metrics tracked successfully",
      });
    } catch (error) {
      console.error("Error logging analytics:", error);
      response.status(500).json({ success: false, error: error.message });
    }
  });

//#2 - Retrieve a single post
postRoutes.route("/posts/:id").get(verifyToken, async (request, response) => {
  try {
    let db = database.getDb();
    let data = await db
      .collection("posts")
      .findOne({ _id: new ObjectId(request.params.id) });
    if (data && Object.keys(data).length > 0) {
      response.json(data);
    } else {
      response.status(404).json({ message: "Post not found" });
    }
  } catch (error) {
    response.status(400).json({ message: "Invalid ID format" });
  }
});

//#4 - Update a post
//#4 - Update a post (Inside backend postRoutes.js)
postRoutes.route("/posts/:id").put(verifyToken, async (request, response) => {
  try {
    let db = database.getDb();
    const paramId = request.params.id;

    // 1. Verify string structure before converting to ObjectId
    if (
      !paramId ||
      paramId.length !== 24 ||
      !/^[0-9a-fA-F]{24}$/.test(paramId)
    ) {
      return response
        .status(400)
        .json({ message: "Invalid Recipe tracking ID format sent." });
    }

    const postId = new ObjectId(paramId);

    // 2. Fetch the post to check ownership boundaries
    const post = await db.collection("posts").findOne({ _id: postId });
    if (!post) {
      return response.status(404).json({ message: "Recipe not found." });
    }

    // 3. HERE IS THE MISSING VARIABLE: Extract user identity from decrypted JWT token payload
    if (!request.user) {
      return response
        .status(401)
        .json({
          message: "Authentication context missing. Please log in again.",
        });
    }

    const currentUserId = request.user.id || request.user._id; // 👈 DEFINED HERE

    // Verify logged-in user matches the recipe author
    if (!currentUserId || post.author.toString() !== currentUserId.toString()) {
      return response
        .status(403)
        .json({ message: "Unauthorized to update this recipe" });
    }

    // 4. Construct payload data and update MongoDB
    let mongoObject = {
      $set: {
        title: request.body.title,
        description: request.body.description,
        content: request.body.content,
        cuisines: Array.isArray(request.body.cuisines)
          ? request.body.cuisines
          : [],
      },
    };

    await db.collection("posts").updateOne({ _id: postId }, mongoObject);
    response.json({ success: true, message: "Recipe updated cleanly." });
  } catch (error) {
    console.error("Backend PUT crash detail:", error);
    response
      .status(500)
      .json({
        message: "Internal server processing error",
        error: error.message,
      });
  }
});
//#5 - Delete a post (Guarded with Ownership Validation)
postRoutes
  .route("/posts/:id")
  .delete(verifyToken, async (request, response) => {
    try {
      let db = database.getDb();
      const postId = new ObjectId(request.params.id);

      const post = await db.collection("posts").findOne({ _id: postId });
      if (!post) {
        return response.status(404).json({ message: "Recipe not found" });
      }

      // Protect delete access behind owner authorization boundaries
      if (post.author.toString() !== request.user.id.toString()) {
        return response
          .status(403)
          .json({ message: "Unauthorized to delete this recipe" });
      }

      let data = await db.collection("posts").deleteOne({ _id: postId });
      response.json(data);
    } catch (error) {
      response.status(500).json({ error: error.message });
    }
  });

// Middleware Function Track Validation Layer
function verifyToken(request, response, next) {
  const authHeaders = request.headers["authorization"];
  const token = authHeaders && authHeaders.split(" ")[1];
  if (!token) {
    return response
      .status(401)
      .json({ message: "Authentication token is missing" });
  }

  jwt.verify(token, process.env.SECRETKEY, (error, user) => {
    if (error) {
      return response
        .status(403)
        .json({ message: "Invalid authentication token" });
    }
    request.user = user;
    next();
  });
}

module.exports = postRoutes;
