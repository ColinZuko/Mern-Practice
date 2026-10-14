const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const database = require("./connect");
require("dotenv").config({ path: require("path").join(__dirname, "config.env") });

// admin  - manage users and roles, edit/delete any post
// editor - write posts, edit/delete their own posts
// user   - read and save recipes (default for new sign-ups)
const ROLES = ["user", "editor", "admin"];

// The login session lives in an httpOnly cookie: JavaScript (including any injected script)
// can't read it, it only travels over HTTPS, and SameSite=Lax keeps it off requests that
// come from other sites. It lasts 30 days and is renewed while people keep using the site.
const SESSION_COOKIE = "pp_session";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax", path: "/" };

function signSession(user) {
  return jwt.sign(
    { _id: String(user._id), email: user.email, name: user.name, joinDate: user.joinDate, role: user.role || "user" },
    process.env.SECRETKEY,
    { expiresIn: `${SESSION_DAYS}d` }
  );
}

function setSessionCookie(response, user) {
  response.cookie(SESSION_COOKIE, signSession(user), { ...COOKIE_OPTIONS, maxAge: SESSION_MS });
}

function clearSessionCookie(response) {
  response.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
}

function readCookie(request, name) {
  for (const part of (request.headers.cookie || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function verifyToken(request, response, next) {
  // The site uses the cookie; an Authorization header still works for scripts and tests
  const authHeaders = request.headers["authorization"];
  const headerToken = authHeaders && authHeaders.split(" ")[1];
  const token = headerToken || readCookie(request, SESSION_COOKIE);
  if (!token) {
    return response
      .status(401)
      .json({ message: "Authentication token is missing" });
  }
  request.tokenFromCookie = !headerToken;

  // CSRF protection: changes made with the cookie must carry a header that other websites
  // can't add (browsers only allow it after a CORS check, which only our own site passes)
  if (request.tokenFromCookie && !SAFE_METHODS.includes(request.method) &&
      request.headers["x-requested-with"] !== "XMLHttpRequest") {
    return response.status(403).json({ message: "Missing X-Requested-With header" });
  }

  // Only accept the algorithm we sign with
  jwt.verify(token, process.env.SECRETKEY, { algorithms: ["HS256"] }, async (error, user) => {
    if (error) {
      if (request.tokenFromCookie) clearSessionCookie(response);
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
          if (request.tokenFromCookie) clearSessionCookie(response);
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

module.exports = { ROLES, SESSION_MS, verifyToken, requireRole, setSessionCookie, clearSessionCookie };
