const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { call, account } = require("./helpers");
const { parseIngredient, searchName } = require("../nutrition");

// A stand-in for the USDA FoodData Central API with real values for a few foods
const n = (kcal, p, f, sf, c, s, fi, na) => ({ 1008: kcal, 1003: p, 1004: f, 1258: sf, 1005: c, 2000: s, 1079: fi, 1093: na });
const FOODS = {
  169844: ["DENNY'S, onion rings", n(385, 5.3, 22.2, 3.7, 41, 4.8, 2.4, 780), []],
  170000: ["Onions, raw", n(40, 1.1, 0.1, 0.04, 9.34, 4.24, 1.7, 4), [["cup, chopped", 160], ["medium (2-1/2 inch dia)", 110]]],
  169230: ["Garlic, raw", n(149, 6.36, 0.5, 0.09, 33.06, 1, 2.1, 17), [["tsp", 2.8], ["clove", 3]]],
  171413: ["Oil, olive, salad or cooking", n(884, 0, 100, 13.8, 0, 0, 0, 2), [["tablespoon", 13.5], ["tsp", 4.5]]],
  168913: ["Wheat flour, white, all-purpose, enriched, bleached", n(364, 10.33, 0.98, 0.16, 76.31, 0.27, 2.7, 2), [["cup", 125]]],
  170051: ["Tomatoes, red, ripe, canned, packed in tomato juice", n(16, 0.79, 0.25, 0.04, 3.47, 2.46, 1.9, 115), [["cup", 240]]],
  173468: ["Salt, table", n(0, 0, 0, 0, 0, 0, 0, 38758), [["tsp", 6]]],
};
const SEARCH = {
  "onions raw": [169844, 170000],
  garlic: [169230],
  "oil olive salad or cooking": [171413],
  "wheat flour white all-purpose enriched": [168913],
  "tomatoes red ripe canned packed in tomato juice": [170051],
  "salt table": [173468],
};
let usdaCalls = 0;
const usda = http.createServer((req, res) => {
  usdaCalls++;
  const url = new URL(req.url, "http://x");
  const food = (id) => ({ fdcId: id, description: FOODS[id][0] });
  if (url.pathname === "/foods/search") {
    return res.end(JSON.stringify({ foods: (SEARCH[url.searchParams.get("query")] || []).map(food) }));
  }
  const ids = url.searchParams.get("fdcIds").split(",").map(Number);
  res.end(
    JSON.stringify(
      ids.map((id) => ({
        ...food(id),
        foodNutrients: Object.entries(FOODS[id][1]).map(([nid, amount]) => ({ nutrient: { id: Number(nid) }, amount })),
        foodPortions: FOODS[id][2].map(([modifier, gramWeight]) => ({ amount: 1, modifier, gramWeight })),
      })),
    ),
  );
});
before(async () => {
  await new Promise((resolve) => usda.listen(0, resolve));
  process.env.USDA_API_URL = `http://127.0.0.1:${usda.address().port}`;
});
after(() => usda.close());

test("ingredient lines are split into amount, unit and food", () => {
  const cases = {
    "500g 00 flour": [500, "g", "flour"],
    "3 tbsp olive oil, plus extra": [3, "tbsp", "olive oil"],
    "2 tins chopped tomatoes": [2, "tin", "tomatoes"],
    "1 x 400g tin chickpeas": [400, "g", "chickpeas"],
    "2-3 carrots, peeled": [2.5, undefined, "carrots"],
    "½ tsp salt": [0.5, "tsp", "salt"],
    "3 garlic cloves": [3, "clove", "garlic"],
    "Flaky sea salt": [null, undefined, "flaky sea salt"],
    "2 carrots cut in cm blocks": [2, undefined, "carrots"],
  };
  for (const [line, [amount, unit, name]] of Object.entries(cases)) {
    const parsed = parseIngredient(line);
    assert.deepEqual([parsed.amount, parsed.unit?.name, parsed.name], [amount, unit, name], line);
  }
});

test("UK names are translated to USDA wording", () => {
  assert.equal(searchName("beef mince"), "beef ground raw");
  assert.equal(searchName("baking soda"), "leavening agents baking soda");
  assert.equal(searchName("double cream"), "cream fluid heavy whipping");
  assert.equal(searchName("flour"), "wheat flour white all-purpose enriched");
});

test("nutrition per serving from an ingredient list", async () => {
  const editor = await account("Editor", { role: "editor" });
  const reader = await account("Reader");
  const ingredients =
    "For the sauce:\n1 onion, chopped\n2 cloves garlic\n2 tbsp olive oil\n1 x 400g tin tomatoes\n\nFor the dough:\n250g flour\nFlaky sea salt";
  const estimate = (as, extra = {}) => call("POST", "/nutrition/estimate", { as, body: { ingredients, servings: 2, ...extra } });

  assert.equal((await estimate(null)).status, 401);
  assert.equal((await estimate(reader)).status, 403);
  assert.equal((await estimate(editor, { servings: "" })).status, 400);

  const { data } = await estimate(editor);
  const line = (start) => data.lines.find((l) => l.text.startsWith(start));
  assert.equal(data.lines.length, 6, "group headings are left out");
  assert.equal(line("1 onion").food.description, "Onions, raw", "brands rank below plain foods");
  assert.equal(line("1 onion").grams, 110);
  assert.equal(line("2 cloves").grams, 6);
  assert.equal(line("2 tbsp").grams, 27);
  assert.equal(line("Flaky").grams, 0);
  // 44 + 8.94 + 238.68 + 64 + 910 kcal, over 2 servings
  assert.equal(data.perServing.calories, 633);

  const changed = await estimate(editor, {
    overrides: { [line("250g").index]: { skip: true }, [line("2 tbsp").index]: { grams: 10 } },
  });
  assert.equal(changed.data.lines.find((l) => l.text.startsWith("250g")).skipped, true);
  assert.equal(changed.data.lines.find((l) => l.text.startsWith("2 tbsp")).grams, 10);

  const callsBefore = usdaCalls;
  await estimate(editor, { servings: 4 });
  assert.equal(usdaCalls, callsBefore, "repeat lookups come from the cache");
});

test("nutrition is saved with a recipe, and nonsense is dropped", async () => {
  const editor = await account("Editor", { role: "editor" });
  const nutrition = { calories: 633, protein: 14.2, fat: 15.4, saturatedFat: 2.2, carbs: 108, sugar: 6.3, fiber: 6.9, sodium: 236 };
  const post = { title: "Pizza", description: "d", content: "", cuisines: [], imageId: "x.webp", notify: false };
  const id = (await call("POST", "/posts", { as: editor, body: { ...post, recipe: { ingredients: "x", method: "y", nutrition } } })).data.insertedId;
  assert.deepEqual((await call("GET", `/posts/${id}`)).data.recipe.nutrition, nutrition);

  await call("PUT", `/posts/${id}`, { as: editor, body: { ...post, recipe: { ingredients: "x", method: "y", nutrition: { calories: "lots" } } } });
  assert.equal((await call("GET", `/posts/${id}`)).data.recipe.nutrition, null);
});
