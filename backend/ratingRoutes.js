const express = require("express");
const database = require("./connect");
const ObjectId = require("mongodb").ObjectId;
const { verifyToken } = require("./auth");

// Recipe ratings from 1 to 5 (shown as slices of bread). One rating per person per recipe,
// which they can change or remove. The recipe keeps its average and count so lists and
// search results can show them without extra work.
let ratingRoutes = express.Router();

function isValidId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

let indexReady = null;
function ratings(db) {
  // One rating per person per recipe, enforced by the database too
  indexReady ??= db.collection("ratings").createIndex({ postId: 1, userId: 1 }, { unique: true });
  return indexReady.then(() => db.collection("ratings"));
}

// Recalculates a recipe's average and count from its ratings
async function refreshRating(db, postId) {
  const [result] = await (await ratings(db))
    .aggregate([{ $match: { postId } }, { $group: { _id: null, average: { $avg: "$value" }, count: { $sum: 1 } } }])
    .toArray();
  const summary = {
    ratingAverage: result ? Math.round(result.average * 10) / 10 : 0,
    ratingCount: result ? result.count : 0,
  };
  if (isValidId(postId)) {
    await db.collection("posts").updateOne({ _id: new ObjectId(postId) }, { $set: summary });
  }
  return summary;
}

// Checks shared by rating and removing a rating; returns an error response or the post
async function checkCanRate(db, request, response) {
  if (!isValidId(request.params.id) || !isValidId(request.user._id)) {
    response.status(400).json({ message: "Invalid ID format" });
    return null;
  }
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(request.user._id) }, { projection: { emailVerified: 1 } });
  if (!user) {
    response.status(401).json({ message: "Account no longer exists" });
    return null;
  }
  if (user.emailVerified === false) {
    response.status(403).json({ message: "Please confirm your email address to rate recipes" });
    return null;
  }
  const post = await db
    .collection("posts")
    .findOne({ _id: new ObjectId(request.params.id) }, { projection: { author: 1 } });
  if (!post) {
    response.status(404).json({ message: "Post not found" });
    return null;
  }
  return post;
}

//#1 - Your own rating of a recipe
ratingRoutes.route("/posts/:id/rating").get(verifyToken, async (request, response) => {
  if (!isValidId(request.params.id)) {
    return response.status(400).json({ message: "Invalid ID format" });
  }
  try {
    const db = database.getDb();
    const mine = await (await ratings(db)).findOne({ postId: request.params.id, userId: request.user._id });
    response.json({ value: mine ? mine.value : null });
  } catch (error) {
    console.error("Error loading rating:", error);
    response.status(500).json({ message: "Server error" });
  }
});

//#2 - Rate a recipe 1-5, or change your rating - signed in with a confirmed email
ratingRoutes.route("/posts/:id/rating").put(verifyToken, async (request, response) => {
  const value = request.body?.value;
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return response.status(400).json({ message: "A rating is a whole number from 1 to 5" });
  }
  try {
    const db = database.getDb();
    const post = await checkCanRate(db, request, response);
    if (!post) return;
    // Rating your own recipe would skew the average (and Google doesn't allow it)
    if (String(post.author) === request.user._id) {
      return response.status(403).json({ message: "You can't rate your own recipe" });
    }

    await (await ratings(db)).updateOne(
      { postId: request.params.id, userId: request.user._id },
      { $set: { value, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    const summary = await refreshRating(db, request.params.id);
    response.json({ ...summary, mine: value });
  } catch (error) {
    console.error("Error saving rating:", error);
    response.status(500).json({ message: "Server error" });
  }
});

//#3 - Remove your rating
ratingRoutes.route("/posts/:id/rating").delete(verifyToken, async (request, response) => {
  try {
    const db = database.getDb();
    const post = await checkCanRate(db, request, response);
    if (!post) return;
    await (await ratings(db)).deleteOne({ postId: request.params.id, userId: request.user._id });
    const summary = await refreshRating(db, request.params.id);
    response.json({ ...summary, mine: null });
  } catch (error) {
    console.error("Error removing rating:", error);
    response.status(500).json({ message: "Server error" });
  }
});

module.exports = { ratingRoutes, refreshRating };
