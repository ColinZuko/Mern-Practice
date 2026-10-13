// Daily database backups to S3.
//
// The free MongoDB Atlas cluster has no automatic backups, so the backend makes one
// itself: once a day it exports every collection (posts, users, comments, ...) to a
// compressed file at s3://colinblogstorage/backups/<database>-<date>.json.gz.
// Backups older than KEEP_DAYS are removed. See restoreDb.js to restore one.
const zlib = require("zlib");
const { promisify } = require("util");
const { EJSON } = require("mongodb").BSON;
const {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { s3Client, s3Bucket } = require("./s3");

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const PREFIX = "backups/";
const KEEP_DAYS = 30;
const CHECK_EVERY_MS = 60 * 60 * 1000; // look once an hour whether today's backup exists

function today() {
  return new Date().toISOString().slice(0, 10);
}

function backupKey(dbName, date = today()) {
  return `${PREFIX}${dbName}-${date}.json.gz`;
}

// Exports every collection; EJSON keeps ObjectIds and dates intact so a restore is exact
async function createBackup(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const data = {};
  const counts = {};
  for (const { name } of collections) {
    if (name.startsWith("system.")) continue;
    data[name] = await db.collection(name).find({}).toArray();
    counts[name] = data[name].length;
  }

  const body = await gzip(
    EJSON.stringify({ createdAt: new Date(), database: db.databaseName, collections: data }, { relaxed: false }),
  );
  const key = backupKey(db.databaseName);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: body,
      ContentType: "application/gzip",
      ServerSideEncryption: "AES256",
    }),
  );
  return { key, size: body.length, counts };
}

async function listBackups(dbName) {
  const result = await s3Client.send(
    new ListObjectsV2Command({ Bucket: s3Bucket, Prefix: `${PREFIX}${dbName}-` }),
  );
  return (result.Contents || [])
    .map((item) => ({ key: item.Key, size: item.Size, lastModified: item.LastModified }))
    .sort((a, b) => b.lastModified - a.lastModified);
}

async function pruneBackups(dbName) {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const old = (await listBackups(dbName)).filter((b) => b.lastModified.getTime() < cutoff);
  for (const backup of old) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: backup.key }));
  }
  return old.length;
}

async function readBackup(key) {
  const object = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: key }));
  const compressed = Buffer.from(await object.Body.transformToByteArray());
  return EJSON.parse((await gunzip(compressed)).toString("utf8"), { relaxed: false });
}

// Replaces the collections in `db` with the ones from the backup
async function restoreBackup(backup, db) {
  const counts = {};
  for (const [name, docs] of Object.entries(backup.collections)) {
    await db.collection(name).deleteMany({});
    if (docs.length) await db.collection(name).insertMany(docs);
    counts[name] = docs.length;
  }
  return counts;
}

// Makes today's backup if it doesn't exist yet. Safe to call often (e.g. after restarts).
async function backupIfDue(getDb) {
  const db = getDb();
  const existing = await listBackups(db.databaseName);
  if (existing.some((b) => b.key === backupKey(db.databaseName))) return null;

  const result = await createBackup(db);
  console.log(`Backup saved: ${result.key} (${Math.round(result.size / 1024)} KB)`, result.counts);
  try {
    const removed = await pruneBackups(db.databaseName);
    if (removed) console.log(`Removed ${removed} backup(s) older than ${KEEP_DAYS} days`);
  } catch (error) {
    console.error("Couldn't remove old backups:", error.name);
  }
  return result;
}

function scheduleDailyBackups(getDb) {
  const run = () =>
    backupIfDue(getDb).catch((error) => console.error("Backup failed:", error));
  setTimeout(run, 60 * 1000); // shortly after start-up
  setInterval(run, CHECK_EVERY_MS).unref();
}

module.exports = {
  createBackup,
  listBackups,
  readBackup,
  restoreBackup,
  backupIfDue,
  scheduleDailyBackups,
};
