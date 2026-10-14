// Give a user a role from the command line, e.g. to make the first admin:
//   node setRole.js you@example.com admin
// Roles: admin, editor, user
const { MongoClient } = require("mongodb");
const { ROLES } = require("./auth");
require("dotenv").config({ path: require("path").join(__dirname, "config.env") });

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role)) {
    console.log(`Usage: node setRole.js <email> <${ROLES.join("|")}>`);
    process.exit(1);
  }

  const client = new MongoClient(process.env.ATLAS_URI);
  try {
    const result = await client
      .db(process.env.DB_NAME || "BlogData")
      .collection("users")
      .updateOne({ email }, { $set: { role } }, { collation: { locale: "en", strength: 2 } });

    if (result.matchedCount === 0) {
      console.log(`No user found with email ${email}`);
      process.exitCode = 1;
    } else {
      console.log(`${email} is now ${role}`);
    }
  } finally {
    await client.close();
  }
}

main();
