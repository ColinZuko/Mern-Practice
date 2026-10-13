// Converts existing recipe photos to WebP (max 2000px) to make pages load faster.
//
//   node convertImages.js           dry run: shows what would change, writes nothing
//   node convertImages.js --apply   uploads the WebP versions and points the posts at them
//
// The original files stay in S3, so a post can be switched back by restoring its old imageId
// (the script prints each old -> new pair). Set DB_NAME to run against another database.
const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");
const { MongoClient } = require("mongodb");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: path.join(__dirname, "config.env") });

const APPLY = process.argv.includes("--apply");
const MAX_SIDE = 2000;
const QUALITY = 82;
const s3Bucket = "colinblogstorage";

const s3Client = new S3Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.MY_AWS_SECRET_KEY || process.env.AWS_SECRET_KEY,
  },
});

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function main() {
  const client = new MongoClient(process.env.ATLAS_URI);
  const posts = client.db(process.env.DB_NAME || "BlogData").collection("posts");
  let before = 0;
  let after = 0;

  try {
    const all = await posts.find({ imageId: { $exists: true, $ne: null } }).toArray();
    console.log(`${APPLY ? "Converting" : "Dry run for"} ${all.length} posts\n`);

    for (const post of all) {
      const label = `"${post.title}"`;
      if (post.imageId.toLowerCase().endsWith(".webp")) {
        console.log(`skip     ${label}: already WebP`);
        continue;
      }

      let original;
      try {
        const object = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: post.imageId }));
        original = Buffer.from(await object.Body.transformToByteArray());
      } catch (error) {
        console.log(`MISSING  ${label}: ${post.imageId} (${error.name})`);
        continue;
      }

      // rotate() applies the photo's orientation tag so portrait phone photos stay upright
      const webp = await sharp(original)
        .rotate()
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      if (webp.length >= original.length) {
        console.log(`keep     ${label}: WebP wouldn't be smaller (${kb(original.length)})`);
        continue;
      }
      before += original.length;
      after += webp.length;

      const newKey = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
      if (APPLY) {
        await s3Client.send(
          new PutObjectCommand({ Bucket: s3Bucket, Key: newKey, Body: webp, ContentType: "image/webp" }),
        );
        await posts.updateOne({ _id: post._id }, { $set: { imageId: newKey, originalImageId: post.imageId } });
      }
      console.log(
        `${APPLY ? "done    " : "would   "} ${label}: ${kb(original.length)} -> ${kb(webp.length)}` +
          (APPLY ? `  (${post.imageId} -> ${newKey})` : ""),
      );
    }

    if (before) {
      console.log(`\nTotal: ${kb(before)} -> ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`);
    }
    if (!APPLY) console.log("\nNothing was changed. Run with --apply to convert.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
