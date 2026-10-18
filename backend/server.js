require("dotenv").config({ path: require("path").join(__dirname, "config.env") });
const connect = require("./connect");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const posts = require("./postRoutes");
const users = require("./userRoutes");
const awsRoutes = require("./awsRoutes");
const comments = require("./commentRoutes");
const { ratingRoutes } = require("./ratingRoutes");
const adminRoutes = require("./adminRoutes");
const { scheduleDailyBackups } = require("./backup");
const multer = require("multer");
// One image per request, at most 10 MB (photos are already shrunk in the browser)
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

const app = express();

// Render sits behind a proxy; this makes request.ip the visitor's address for rate limiting
if (process.env.RENDER) app.set("trust proxy", 1);

// Only these sites may call the API from a browser. FRONTEND_URL can add more
// (comma-separated); "*" is ignored because it would let any website use people's logins.
const DEFAULT_ORIGINS = [
  "https://pickleandpan.com",
  "https://www.pickleandpan.com",
  "https://mern-blog-frontend-gray.vercel.app",
  "http://localhost:5173",
];
const extraOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter((origin) => origin && origin !== "*");
if ((process.env.FRONTEND_URL || "").includes("*")) {
  console.warn('FRONTEND_URL contains "*", which is ignored; allowed sites:', [...DEFAULT_ORIGINS, ...extraOrigins]);
}
const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...extraOrigins]);

app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  }),
);

// Standard security headers. Images are embedded by the site on another domain, so allow that.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Lightweight check for uptime pings (keeps Render's free instance awake); never touches the database
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "ok" });
});

app.use(express.json({ limit: "200kb" }));
app.use(upload.any());

// Middleware 1: Force MongoDB connection initialization on every request
app.use(async (req, res, next) => {
  try {
    await connect.connectToServer();
    next();
  } catch (err) {
    console.error("Database connection failure in serverless context:", err);
    res.status(500).json({ message: "Database connection error" });
  }
});

// Middleware 2: FIX 404 ERROR — Strip the /api prefix for Vercel Serverless matching
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    req.url = req.url.replace(/^\/api/, ""); // Rewrites '/api/users/login' to '/users/login'
    if (req.url === "") req.url = "/"; // Handle clean root fallback bounds safely
  }
  next();
});

// Mount routes cleanly (Express can now match them exactly like it did locally)
app.use(posts);
app.use(users);
app.use(awsRoutes);
app.use(comments);
app.use(ratingRoutes);
app.use(adminRoutes);

// Turn errors into short JSON messages instead of HTML pages with internal details
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "That image is too large (max 10 MB)" : "Invalid upload";
    return res.status(413).json({ message });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request is too large" });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request" });
  }
  console.error("Unhandled error:", error);
  res.status(500).json({ message: "Server error" });
});

// Vercel imports the app as a serverless function; everywhere else (Render, local) we need a listening server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port: ${PORT}`);
  });

  // Daily database backup to S3. Runs on Render (kept awake by the uptime pings);
  // set ENABLE_BACKUPS=true to run it elsewhere.
  if (process.env.RENDER || process.env.ENABLE_BACKUPS === "true") {
    scheduleDailyBackups(() => {
      connect.connectToServer();
      return connect.getDb();
    });
  }
}

module.exports = app;
