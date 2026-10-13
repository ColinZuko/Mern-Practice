const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { requireRole } = require("./auth");
require("dotenv").config({ path: path.join(__dirname, "config.env") });

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

let awsRoutes = express.Router();
const s3Bucket = "colinblogstorage";

const s3Client = new S3Client({
  region: "eu-north-1",
  // Render still uses the older AWS_* names, local config.env uses MY_AWS_*; accept either
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.MY_AWS_SECRET_KEY || process.env.AWS_SECRET_KEY,
  },
});

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// Older uploads were stored without a content type, so fall back to the file extension
function contentTypeFor(key, storedType) {
  if (storedType && storedType !== "application/octet-stream") return storedType;
  return MIME_TYPES[path.extname(key).toLowerCase()] || "application/octet-stream";
}

//#1 - Retrieve an image as a base64 data URL (kept for older clients) - public
awsRoutes.route("/images/:id").get(async (request, response) => {
  try {
    const id = request.params.id;
    const data = await s3Client.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: id }),
    );

    const srcString = await data.Body.transformToString("base64");
    const imageSource = `data:${contentTypeFor(id, data.ContentType)};base64,${srcString}`;

    response.json({ imageSource });
  } catch (error) {
    console.error("Error fetching image from S3:", error);
    const status = error.name === "NoSuchKey" ? 404 : 500;
    response.status(status).json({ message: "Could not load image" });
  }
});

//#1b - Stream the image file itself so <img src> can point straight at it and browsers can cache it - public
awsRoutes.route("/images/:id/raw").get(async (request, response) => {
  try {
    const id = request.params.id;
    const data = await s3Client.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: id }),
    );

    response.set({
      "Content-Type": contentTypeFor(id, data.ContentType),
      "Cache-Control": "public, max-age=604800",
    });
    if (data.ContentLength) response.set("Content-Length", data.ContentLength);
    data.Body.pipe(response);
  } catch (error) {
    const status = error.name === "NoSuchKey" ? 404 : 500;
    if (status === 500) console.error("Error streaming image from S3:", error);
    response.status(status).end();
  }
});

//#2 - Upload an image - editors and admins only
awsRoutes
  .route("/images")
  .post(requireRole("editor", "admin"), async (request, response) => {
    const file = request.files && request.files[0];
    if (!file) {
      return response.status(400).json({ message: "No image uploaded" });
    }

    const extension = path.extname(file.originalname).toLowerCase();
    if (!MIME_TYPES[extension]) {
      return response
        .status(400)
        .json({ message: "Only jpg, png, webp or gif images are allowed" });
    }

    // Unique key so two uploads called "image.jpg" can't overwrite each other
    const key = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: key,
          Body: file.buffer,
          ContentType: MIME_TYPES[extension],
        }),
      );
      response.json({ key });
    } catch (error) {
      console.error("Error uploading image to S3:", error);
      response.status(500).json({ message: "Image upload failed" });
    }
  });

module.exports = awsRoutes;
