// Manage database backups from the command line (run from the backend folder):
//
//   node backupDb.js list                         show the stored backups
//   node backupDb.js now                          make a backup right now
//   node backupDb.js restore <key>                restore into "BlogData_restore" to inspect it safely
//   node backupDb.js restore <key> --into BlogData --overwrite
//                                                 replace the live database with the backup
//
// <key> is a name from the list, e.g. backups/BlogData-2026-10-13.json.gz
// Set DB_NAME to work with a different database than BlogData.
const path = require("path");
const { MongoClient } = require("mongodb");
const { createBackup, listBackups, readBackup, restoreBackup } = require("./backup");
require("dotenv").config({ path: path.join(__dirname, "config.env") });

const LIVE_DB = process.env.DB_NAME || "BlogData";

function option(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const [command, key] = process.argv.slice(2);
  const client = new MongoClient(process.env.ATLAS_URI);
  try {
    if (command === "list") {
      const backups = await listBackups(LIVE_DB);
      if (!backups.length) console.log("No backups yet.");
      for (const b of backups) {
        console.log(`${b.key}  ${Math.round(b.size / 1024)} KB  ${b.lastModified.toISOString()}`);
      }
    } else if (command === "now") {
      const result = await createBackup(client.db(LIVE_DB));
      console.log(`Saved ${result.key} (${Math.round(result.size / 1024)} KB)`, result.counts);
    } else if (command === "restore" && key) {
      const target = option("--into") || "BlogData_restore";
      if (target === LIVE_DB && !process.argv.includes("--overwrite")) {
        console.log(`Restoring into the live database "${target}" replaces everything in it.`);
        console.log("Add --overwrite if that's really what you want.");
        process.exitCode = 1;
        return;
      }
      const backup = await readBackup(key);
      console.log(`Backup from ${backup.createdAt.toISOString()} (database ${backup.database})`);
      const counts = await restoreBackup(backup, client.db(target));
      console.log(`Restored into "${target}":`, counts);
    } else {
      console.log("Usage: node backupDb.js list | now | restore <key> [--into <database> --overwrite]");
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
