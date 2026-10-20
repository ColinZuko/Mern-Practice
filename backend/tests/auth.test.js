const { test } = require("node:test");
const assert = require("node:assert/strict");
const { call, account, baseUrl, PASSWORD } = require("./helpers");

test("login sets a secure, httpOnly session cookie that keeps you signed in", async () => {
  const user = await account("Ada");
  const res = await call("POST", "/users/login", { body: { email: user.email, password: PASSWORD } });
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("pp_session="));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.equal(res.data.token, undefined, "the token stays out of reach of page scripts");

  const me = await fetch(`${baseUrl()}/users/me`, { headers: { Cookie: user.cookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).email, user.email);
});

test("wrong passwords and unknown emails get the same answer", async () => {
  const user = await account("Bob");
  const wrong = await call("POST", "/users/login", { body: { email: user.email, password: "nope-nope-1" } });
  const unknown = await call("POST", "/users/login", { body: { email: "nobody@test.invalid", password: "nope-nope-1" } });
  assert.equal(wrong.status, unknown.status);
  assert.deepEqual(wrong.data, unknown.data);
});

test("email lookups ignore capitals", async () => {
  const user = await account("Cleo");
  const res = await call("POST", "/users/login", { body: { email: user.email.toUpperCase(), password: PASSWORD } });
  assert.equal(res.status, 200);
});

test("changes made with the cookie need the X-Requested-With header (CSRF protection)", async () => {
  const user = await account("Dan");
  const without = await fetch(`${baseUrl()}/users/logout`, { method: "POST", headers: { Cookie: user.cookie } });
  // logout is harmless and allowed; a real change is not
  assert.equal(without.status, 200);
  const change = await fetch(`${baseUrl()}/users/${user.id}`, {
    method: "DELETE",
    headers: { Cookie: user.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  assert.equal(change.status, 403);
});

test("objects instead of strings are not run as database queries", async () => {
  const res = await call("POST", "/users/login", { body: { email: { $ne: null }, password: { $ne: null } } });
  assert.notEqual(res.status, 200);
});
