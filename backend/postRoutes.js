const express = require("express");
const database = require("./connect");
const ObjectId = require("mongodb").ObjectId;
const { requireRole } = require("./auth");

let postRoutes = express.Router();

// Search text goes into a regex, so escape it to stop users injecting regex syntax
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

// Admins can manage any post, editors only their own
function canManagePost(user, post) {
  if (user.role === "admin") return true;
  return !!post.author && post.author.toString() === user._id.toString();
}

//#1 - Retrieve all posts (search, cuisine and author filters) - public
postRoutes.route("/posts").get(async (request, response) => {
  try {
    let db = database.getDb();
    let query = {};

    if (request.query.cuisine) {
      query.cuisines = { $in: [String(request.query.cuisine).toLowerCase()] };
    }

    if (request.query.author) {
      query.author = String(request.query.author);
    }

    if (request.query.search) {
      const pattern = escapeRegex(String(request.query.search));
      query.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { content: { $regex: pattern, $options: "i" } },
      ];
    }

    let data = await db
      .collection("posts")
      .find(query)
      .sort({ dateCreated: -1 })
      .toArray();
    response.json(data || []);
  } catch (error) {
    response
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

//#1b - Retrieve top 6 trending/most viewed posts - public
postRoutes.route("/posts/trending").get(async (request, response) => {
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

//#2 - Retrieve a single post - public
postRoutes.route("/posts/:id").get(async (request, response) => {
  if (!isValidId(request.params.id)) {
    return response.status(400).json({ message: "Invalid ID format" });
  }
  try {
    let db = database.getDb();
    let data = await db
      .collection("posts")
      .findOne({ _id: new ObjectId(request.params.id) });
    if (data) {
      response.json(data);
    } else {
      response.status(404).json({ message: "Post not found" });
    }
  } catch (error) {
    response.status(500).json({ message: "Server error" });
  }
});

//#3 - Create a post - editors and admins only
postRoutes
  .route("/posts")
  .post(requireRole("editor", "admin"), async (request, response) => {
    try {
      let db = database.getDb();
      let mongoObject = {
        title: request.body.title,
        description: request.body.description,
        content: request.body.content,
        dateCreated: new Date(),
        cuisines: Array.isArray(request.body.cuisines)
          ? request.body.cuisines
          : [],
        imageId: request.body.imageId,
        // Author always comes from the verified account, never the request body
        author: request.user._id,
        authorName: request.user.name,
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

//#3b - Increment view count on a single post - public so guest views count too
postRoutes.route("/posts/:id/view").patch(async (request, response) => {
  if (!isValidId(request.params.id)) {
    return response.status(400).json({ message: "Invalid ID format" });
  }
  try {
    let db = database.getDb();
    let data = await db
      .collection("posts")
      .updateOne(
        { _id: new ObjectId(request.params.id) },
        { $inc: { views: 1 } },
      );

    if (data.matchedCount === 0) {
      return response.status(404).json({ message: "Post not found" });
    }
    response.json({ success: true });
  } catch (error) {
    console.error("Error logging view:", error);
    response.status(500).json({ success: false, error: error.message });
  }
});

//#4 - Update a post - its author (editor) or any admin
postRoutes
  .route("/posts/:id")
  .put(requireRole("editor", "admin"), async (request, response) => {
    if (!isValidId(request.params.id)) {
      return response.status(400).json({ message: "Invalid ID format" });
    }
    try {
      let db = database.getDb();
      const postId = new ObjectId(request.params.id);

      const post = await db.collection("posts").findOne({ _id: postId });
      if (!post) {
        return response.status(404).json({ message: "Recipe not found." });
      }
      if (!canManagePost(request.user, post)) {
        return response
          .status(403)
          .json({ message: "Unauthorized to update this recipe" });
      }

      let changes = {
        title: request.body.title,
        description: request.body.description,
        content: request.body.content,
        cuisines: Array.isArray(request.body.cuisines)
          ? request.body.cuisines
          : [],
        dateUpdated: new Date(),
      };
      // Only replace the cover image when a new one was uploaded
      if (request.body.imageId) changes.imageId = request.body.imageId;

      await db.collection("posts").updateOne({ _id: postId }, { $set: changes });
      response.json({ success: true, message: "Recipe updated." });
    } catch (error) {
      console.error("Backend PUT crash detail:", error);
      response.status(500).json({
        message: "Internal server processing error",
        error: error.message,
      });
    }
  });

//#5 - Delete a post - its author (editor) or any admin
postRoutes
  .route("/posts/:id")
  .delete(requireRole("editor", "admin"), async (request, response) => {
    if (!isValidId(request.params.id)) {
      return response.status(400).json({ message: "Invalid ID format" });
    }
    try {
      let db = database.getDb();
      const postId = new ObjectId(request.params.id);

      const post = await db.collection("posts").findOne({ _id: postId });
      if (!post) {
        return response.status(404).json({ message: "Recipe not found" });
      }
      if (!canManagePost(request.user, post)) {
        return response
          .status(403)
          .json({ message: "Unauthorized to delete this recipe" });
      }

      let data = await db.collection("posts").deleteOne({ _id: postId });
      // Remove it from everyone's saved list too
      await db
        .collection("users")
        .updateMany({ saved: request.params.id }, { $pull: { saved: request.params.id } });

      response.json({ success: true, message: "Post deleted successfully", data });
    } catch (error) {
      console.error("Backend DELETE crash detail:", error);
      response.status(500).json({ error: error.message });
    }
  });

module.exports = postRoutes;
