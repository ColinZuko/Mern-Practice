const express = require("express");
const database = require("./connect");
const { requireRole } = require("./auth");
const { createBackup, listBackups } = require("./backup");

let adminRoutes = express.Router();

//#1 - Recent database backups - admins only
adminRoutes.route("/admin/backups").get(requireRole("admin"), async (request, response) => {
  try {
    const db = database.getDb();
    const backups = await listBackups(db.databaseName);
    response.json(backups.slice(0, 10));
  } catch (error) {
    console.error("Listing backups failed:", error);
    response.status(500).json({ message: "Couldn't load the backups" });
  }
});

//#2 - Make a backup right now - admins only
adminRoutes.route("/admin/backups").post(requireRole("admin"), async (request, response) => {
  try {
    const result = await createBackup(database.getDb());
    response.json(result);
  } catch (error) {
    console.error("Manual backup failed:", error);
    response.status(500).json({ message: "The backup failed. Please try again." });
  }
});

module.exports = adminRoutes;
