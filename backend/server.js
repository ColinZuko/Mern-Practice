require("dotenv").config();
const connect = require("./connect");
const express = require("express");
const cors = require("cors");
const posts = require("./postRoutes");
const users = require("./userRoutes");
const awsRoutes = require("./awsRoutes");
const multer = require("multer");
const upload = multer();

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(upload.any());

// Middleware 1: MongoDB connection handling
const isServerless = process.env.VERCEL;

if (isServerless) {
  app.use(async (req, res, next) => {
    try {
      await connect.connectToServer();
      next();
    } catch (err) {
      console.error("Database connection failure in serverless context:", err);
      res.status(500).json({ message: "Database connection error" });
    }
  });
} else {
  // For local development, connect to the database once.
  connect.connectToServer();
}

// Middleware 2: Strip the /api prefix for Vercel Serverless matching
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    req.url = req.url.replace(/^\/api/, ""); // Rewrites '/api/users/login' to '/users/login'
    if (req.url === "") req.url = "/";
  }
  next();
});

// Mount routes
app.use(posts);
app.use(users);
app.use(awsRoutes);

// --- ADD THIS BLOCK FOR LOCAL DEVELOPMENT ---
if (!isServerless) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend server running locally on port ${PORT}`);
  });
}

module.exports = app;
