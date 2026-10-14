const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const database = require("./connect");
require("dotenv").config({ path: require("path").join(__dirname, "config.env") });

// admin  - manage users and roles, edit/delete any post
// editor - write posts, edit/delete their own posts
// user   - read and save recipes (default for new sign-ups)
const ROLES = ["user", "editor", "admin"];

function verifyToken(request, response, next) {
  const authHeaders = request.headers["authorization"];
  const token = authHeaders && authHeaders.split(" ")[1];
  if (!token) {
    return response
      .status(401)
      .json({ message: "Authentication token is missing" });
  }

  // Only accept the algorithm we sign with
  jwt.verify(token, process.env.SECRETKEY, { algorithms: ["HS256"] }, async (error, user) => {
    if (error) {
      return response
        .status(403)
        .json({ message: "Invalid authentication token" });
    }
    try {
      // Logins from before a password reset no longer count (e.g. if someone else had access).
      // A second of leeway because token times are rounded down to whole seconds.
      if (ObjectId.isValid(user._id)) {
        const account = await database
          .getDb()
          .collection("users")
          .findOne({ _id: new ObjectId(user._id) }, { projection: { passwordChangedAt: 1 } });
        if (account?.passwordChangedAt && user.iat * 1000 < account.passwordChangedAt.getTime() - 1000) {
          return response
            .status(401)
            .json({ message: "Your password was changed. Please sign in again." });
        }
      }
    } catch (lookupError) {
      console.error("Session check failed:", lookupError);
      return response.status(500).json({ message: "Server error" });
    }
    request.user = user;
    next();
  });
}

// Checks the user's role in the database rather than trusting the token,
// so promoting or demoting someone takes effect immediately
function requireRole(...allowedRoles) {
  return [
    verifyToken,
    async (request, response, next) => {
      try {
        if (!ObjectId.isValid(request.user._id)) {
          return response.status(401).json({ message: "Invalid account" });
        }
        let db = database.getDb();
        const user = await db
          .collection("users")
          .findOne(
            { _id: new ObjectId(request.user._id) },
            { projection: { name: 1, role: 1 } },
          );
        if (!user) {
          return response
            .status(401)
            .json({ message: "Account no longer exists" });
        }

        const role = user.role || "user";
        if (!allowedRoles.includes(role)) {
          return response
            .status(403)
            .json({ message: "You don't have permission to do this" });
        }

        request.user = { ...request.user, name: user.name, role };
        next();
      } catch (error) {
        console.error("Role check failed:", error);
        response.status(500).json({ message: "Server error" });
      }
    },
  ];
}

module.exports = { ROLES, verifyToken, requireRole };
