const express = require("express");
const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");
const { requireRole } = require("./auth");
require("dotenv").config({ path: path.join(__dirname, "config.env") });

const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, s3Bucket } = require("./s3");

let awsRoutes = express.Router();

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

// Small in-memory cache: link previews are fetched now and then, no need to redo the work each time
const shareImageCache = new Map();
const SHARE_CACHE_SIZE = 30;

//#1c - Share image for link previews (WhatsApp, Facebook, Google): a 1200x630 JPEG, the size
// and format every app supports, cropped from the centre (where the dish usually is) - public
awsRoutes.route("/images/:id/og").get(async (request, response) => {
  const id = request.params.id;
  try {
    let jpeg = shareImageCache.get(id);
    if (!jpeg) {
      const data = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: id }));
      const original = Buffer.from(await data.Body.transformToByteArray());
      jpeg = await sharp(original)
        .rotate()
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      shareImageCache.set(id, jpeg);
      if (shareImageCache.size > SHARE_CACHE_SIZE) {
        shareImageCache.delete(shareImageCache.keys().next().value);
      }
    }
    response.set({ "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" });
    response.send(jpeg);
  } catch (error) {
    const status = error.name === "NoSuchKey" ? 404 : 500;
    if (status === 500) console.error("Error making share image:", error);
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
