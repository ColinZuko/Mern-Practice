const express = require("express");
const database = require("./connect");
const ObjectId = require("mongodb").ObjectId;
const { verifyToken } = require("./auth");

let commentRoutes = express.Router();

const MAX_COMMENT_LENGTH = 2000;
const COMMENT_COOLDOWN_MS = 10 * 1000;

function isValidId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

// Loads the logged-in user's current details (role, email status) from the database
async function currentUser(db, request) {
  if (!isValidId(request.user._id)) return null;
  return db
    .collection("users")
    .findOne(
      { _id: new ObjectId(request.user._id) },
      { projection: { name: 1, role: 1, emailVerified: 1 } },
    );
}

//#1 - Comments on a post, oldest first - public
commentRoutes.route("/posts/:id/comments").get(async (request, response) => {
  if (!isValidId(request.params.id)) {
    return response.status(400).json({ message: "Invalid ID format" });
  }
  try {
    let db = database.getDb();
    const comments = await db
      .collection("comments")
      .find({ postId: request.params.id })
      .sort({ dateCreated: 1 })
      .toArray();
    response.json(comments);
  } catch (error) {
    console.error("Error loading comments:", error);
    response.status(500).json({ message: "Server error" });
  }
});

//#2 - Add a comment - signed in with a confirmed email
commentRoutes.route("/posts/:id/comments").post(verifyToken, async (request, response) => {
  if (!isValidId(request.params.id)) {
    return response.status(400).json({ message: "Invalid ID format" });
  }
  const text = typeof request.body.text === "string" ? request.body.text.trim() : "";
  if (!text) {
    return response.status(400).json({ message: "Your comment is empty" });
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return response
      .status(400)
      .json({ message: `Comments can be at most ${MAX_COMMENT_LENGTH} characters` });
  }

  try {
    let db = database.getDb();
    const user = await currentUser(db, request);
    if (!user) {
      return response.status(401).json({ message: "Account no longer exists" });
    }
    if (user.emailVerified === false) {
      return response
        .status(403)
        .json({ message: "Please confirm your email address to comment" });
    }

    const postExists = await db
      .collection("posts")
      .countDocuments({ _id: new ObjectId(request.params.id) }, { limit: 1 });
    if (!postExists) {
      return response.status(404).json({ message: "Post not found" });
    }

    // Simple flood protection: one comment every few seconds per person
    const recent = await db.collection("comments").findOne({
      author: request.user._id,
      dateCreated: { $gt: new Date(Date.now() - COMMENT_COOLDOWN_MS) },
    });
    if (recent) {
      return response
        .status(429)
        .json({ message: "You're commenting very quickly. Please wait a few seconds." });
    }

    const comment = {
      postId: request.params.id,
      author: request.user._id,
      authorName: user.name,
      text,
      dateCreated: new Date(),
    };
    const result = await db.collection("comments").insertOne(comment);
    response.json({ ...comment, _id: result.insertedId });
  } catch (error) {
    console.error("Error adding comment:", error);
    response.status(500).json({ message: "Server error" });
  }
});

//#3 - Delete a comment - its writer, the post's author, or an admin
commentRoutes.route("/comments/:id").delete(verifyToken, async (request, response) => {
  if (!isValidId(request.params.id)) {
    return response.status(400).json({ message: "Invalid ID format" });
  }
  try {
    let db = database.getDb();
    const comment = await db
      .collection("comments")
      .findOne({ _id: new ObjectId(request.params.id) });
    if (!comment) {
      return response.status(404).json({ message: "Comment not found" });
    }

    const user = await currentUser(db, request);
    if (!user) {
      return response.status(401).json({ message: "Account no longer exists" });
    }

    const isWriter = comment.author === request.user._id;
    const isAdmin = user.role === "admin";
    let isPostAuthor = false;
    if (!isWriter && !isAdmin && isValidId(comment.postId)) {
      const post = await db
        .collection("posts")
        .findOne({ _id: new ObjectId(comment.postId) }, { projection: { author: 1 } });
      isPostAuthor = !!post && String(post.author) === request.user._id;
    }

    if (!isWriter && !isAdmin && !isPostAuthor) {
      return response
        .status(403)
        .json({ message: "You can't delete this comment" });
    }

    await db.collection("comments").deleteOne({ _id: comment._id });
    response.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    response.status(500).json({ message: "Server error" });
  }
});

module.exports = commentRoutes;
