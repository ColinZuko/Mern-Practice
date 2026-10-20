// Shared setup for the API tests: each test file gets its own throwaway database and server.
// Run with `npm test` (uses ATLAS_URI from config.env, or a local MongoDB in CI).
const { after, before } = require("node:test");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "config.env"), quiet: true });

// Never point the tests at real data: the database is dropped afterwards
process.env.DB_NAME = `${process.env.TEST_DB_PREFIX || "BlogData"}_${process.pid}_test`;
process.env.SECRETKEY ||= "test-secret";
delete process.env.RESEND_API_KEY; // emails are printed instead of sent

const connect = require("../connect");
const app = require("../server");

let server;
let base;
before(async () => {
  connect.connectToServer();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  const db = connect.getDb();
  if (!db.databaseName.endsWith("_test")) throw new Error(`Refusing to drop ${db.databaseName}`);
  await db.dropDatabase();
  await new Promise((resolve) => server.close(resolve));
  await db.client.close();
});

const db = () => connect.getDb();

// A JSON request; `as` is an account from account() (sends its login as a Bearer token)
async function call(method, url, { as, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(as ? { Authorization: `Bearer ${as.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body
  }
  return { status: res.status, data, headers: res.headers };
}

const PASSWORD = "Test!2345";
let counter = 0;

// Signs up and logs in a new account; role and email confirmation are set directly in the database
async function account(name = "User", { role = "user", verified = true } = {}) {
  const email = `${name.toLowerCase()}-${++counter}@test.invalid`;
  await call("POST", "/users", { body: { name, email, password: PASSWORD } });
  await db().collection("users").updateOne({ email }, { $set: { role, emailVerified: verified } });
  const login = await call("POST", "/users/login", { body: { email, password: PASSWORD } });
  const cookie = (login.headers.getSetCookie?.() || []).find((c) => c.startsWith("pp_session="));
  if (!cookie) throw new Error(`Login failed for ${email}: ${login.status}`);
  const token = decodeURIComponent(cookie.split(";")[0].slice("pp_session=".length));
  const me = await call("GET", "/users/me", { as: { token } });
  return { name, email, token, id: me.data._id, cookie: cookie.split(";")[0] };
}

async function recipe(as, fields = {}) {
  const res = await call("POST", "/posts", {
    as,
    body: { title: "Test pie", description: "d", content: "", cuisines: [], imageId: "x.webp", notify: false, ...fields },
  });
  return res.data.insertedId;
}

module.exports = { call, account, recipe, db, PASSWORD, baseUrl: () => base };
