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

module.exports = app;
