const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: require("path").join(__dirname, "config.env") });

const s3Bucket = "colinblogstorage";

const s3Client = new S3Client({
  region: "eu-north-1",
  // Render still uses the older AWS_* names, local config.env uses MY_AWS_*; accept either
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.MY_AWS_SECRET_KEY || process.env.AWS_SECRET_KEY,
  },
});

module.exports = { s3Client, s3Bucket };
