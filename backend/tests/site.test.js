const { test } = require("node:test");
const assert = require("node:assert/strict");
const { baseUrl } = require("./helpers");

test("the bare API address sends visitors to the website", async () => {
  const res = await fetch(`${baseUrl()}/`, { redirect: "manual" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://pickleandpan.com/");
});
