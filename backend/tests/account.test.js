const { test } = require("node:test");
const assert = require("node:assert/strict");
const { call, account, recipe, PASSWORD } = require("./helpers");

test("the data export lists your comments and ratings", async () => {
  const editor = await account("Editor", { role: "editor" });
  const reader = await account("Reader");
  const id = await recipe(editor, { title: "Rated pie" });
  await call("PUT", `/posts/${id}/rating`, { as: reader, body: { value: 3 } });
  await call("POST", `/posts/${id}/comments`, { as: reader, body: { text: "Lovely" } });

  const exported = (await call("GET", "/users/me/export", { as: reader })).data;
  assert.equal(exported.ratings[0].recipe, "Rated pie");
  assert.equal(exported.ratings[0].rating, 3);
  assert.equal(exported.comments.length, 1);
});

// This broke in production once: `distinct` isn't allowed under the strict Stable API
test("deleting your account removes your ratings and comments, and recalculates averages", async () => {
  const editor = await account("Editor", { role: "editor" });
  const leaving = await account("Leaving");
  const staying = await account("Staying");
  const id = await recipe(editor);
  await call("PUT", `/posts/${id}/rating`, { as: leaving, body: { value: 1 } });
  await call("PUT", `/posts/${id}/rating`, { as: staying, body: { value: 5 } });
  await call("POST", `/posts/${id}/comments`, { as: leaving, body: { text: "Bye" } });

  assert.equal((await call("DELETE", `/users/${leaving.id}`, { as: leaving, body: { password: "wrong-pass-1" } })).status, 401);
  assert.equal((await call("DELETE", `/users/${leaving.id}`, { as: leaving, body: { password: PASSWORD } })).status, 200);

  const post = (await call("GET", `/posts/${id}`)).data;
  assert.equal(`${post.ratingAverage}/${post.ratingCount}`, "5/1");
  assert.equal((await call("GET", `/posts/${id}/comments`)).data.length, 0);
  assert.equal((await call("GET", "/users/me", { as: leaving })).status === 200, false, "old login stops working");
});

test("published recipes stay online when their author leaves", async () => {
  const editor = await account("Writer", { role: "editor" });
  const id = await recipe(editor);
  await call("DELETE", `/users/${editor.id}`, { as: editor, body: { password: PASSWORD } });
  assert.equal((await call("GET", `/posts/${id}`)).data.authorName, "Former contributor");
});

test("admins can remove others, but never the last admin", async () => {
  const admin = await account("Admin", { role: "admin" });
  const reader = await account("Reader");
  assert.equal((await call("DELETE", `/users/${reader.id}`, { as: admin })).status, 200);
  assert.equal((await call("DELETE", `/users/${admin.id}`, { as: admin, body: { password: PASSWORD } })).status, 400);
});
