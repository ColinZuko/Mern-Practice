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
