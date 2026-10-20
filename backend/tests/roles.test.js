const { test } = require("node:test");
const assert = require("node:assert/strict");
const { call, account, recipe } = require("./helpers");

const body = { title: "Soup", description: "d", content: "", cuisines: [], imageId: "x.webp", notify: false };

test("guests and readers can read but not publish", async () => {
  const reader = await account("Reader");
  assert.equal((await call("GET", "/posts")).status, 200);
  assert.equal((await call("POST", "/posts", { body })).status, 401);
  assert.equal((await call("POST", "/posts", { as: reader, body })).status, 403);
});

test("editors manage only their own recipes, admins manage all", async () => {
  const editor = await account("Editor", { role: "editor" });
  const other = await account("Other", { role: "editor" });
  const admin = await account("Admin", { role: "admin" });
  const id = await recipe(editor);
  assert.ok(id);

  const edit = (as, title) => call("PUT", `/posts/${id}`, { as, body: { ...body, title } });
  assert.equal((await edit(other, "Hijacked")).status, 403);
  assert.equal((await edit(editor, "Mine")).status, 200);
  assert.equal((await edit(admin, "Fixed by admin")).status, 200);
  assert.equal((await call("GET", `/posts/${id}`)).data.title, "Fixed by admin");

  assert.equal((await call("DELETE", `/posts/${id}`, { as: other })).status, 403);
  assert.equal((await call("DELETE", `/posts/${id}`, { as: editor })).status, 200);
});

test("only admins change roles, and only for confirmed emails", async () => {
  const admin = await account("Boss", { role: "admin" });
  const editor = await account("Ed", { role: "editor" });
  const unconfirmed = await account("New", { verified: false });
  const setRole = (as, user, role) => call("PATCH", `/users/${user.id}/role`, { as, body: { role } });
  assert.equal((await setRole(editor, unconfirmed, "editor")).status, 403);
  assert.equal((await setRole(admin, unconfirmed, "editor")).status, 400);
});
