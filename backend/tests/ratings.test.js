const { test } = require("node:test");
const assert = require("node:assert/strict");
const { call, account, recipe, db } = require("./helpers");

const summary = async (id) => {
  const post = (await call("GET", `/posts/${id}`)).data;
  return `${post.ratingAverage}/${post.ratingCount}`;
};

test("who may rate, and which values count", async () => {
  const editor = await account("Editor", { role: "editor" });
  const reader = await account("Reader");
  const unconfirmed = await account("New", { verified: false });
  const id = await recipe(editor);
  const rate = (as, value) => call("PUT", `/posts/${id}/rating`, { as, body: { value } });

  assert.equal((await rate(null, 4)).status, 401);
  assert.equal((await rate(unconfirmed, 4)).status, 403);
  assert.equal((await rate(editor, 5)).status, 403, "authors can't rate their own recipe");
  for (const bad of [0, 6, 3.5, "5", null]) assert.equal((await rate(reader, bad)).status, 400, `rating ${bad}`);
  const missing = await call("PUT", "/posts/000000000000000000000000/rating", { as: reader, body: { value: 4 } });
  assert.equal(missing.status, 404);
});

test("averages update, a changed rating replaces the old one, removing recalculates", async () => {
  const editor = await account("Editor", { role: "editor" });
  const a = await account("Alice");
  const b = await account("Bob");
  const id = await recipe(editor);
  const rate = (as, value) => call("PUT", `/posts/${id}/rating`, { as, body: { value } });

  const first = await rate(a, 4);
  assert.deepEqual(first.data, { ratingAverage: 4, ratingCount: 1, mine: 4 });
  await rate(b, 5);
  assert.equal(await summary(id), "4.5/2");
  await rate(a, 2);
  assert.equal(await summary(id), "3.5/2");
  assert.equal((await call("GET", `/posts/${id}/rating`, { as: a })).data.value, 2);

  // Quick repeated clicks still count once
  await Promise.all([rate(b, 3), rate(b, 3), rate(b, 3)]);
  assert.equal(await summary(id), "2.5/2");
  assert.equal(await db().collection("ratings").countDocuments({ postId: id, userId: b.id }), 1);

  const removed = await call("DELETE", `/posts/${id}/rating`, { as: a });
  assert.deepEqual(removed.data, { ratingAverage: 3, ratingCount: 1, mine: null });
});

test("deleting a recipe deletes its ratings", async () => {
  const editor = await account("Editor", { role: "editor" });
  const reader = await account("Reader");
  const id = await recipe(editor);
  await call("PUT", `/posts/${id}/rating`, { as: reader, body: { value: 5 } });
  assert.equal((await call("DELETE", `/posts/${id}`, { as: editor })).status, 200);
  assert.equal(await db().collection("ratings").countDocuments({ postId: id }), 0);
});
