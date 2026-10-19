// Estimates a recipe's nutrition from its ingredient list, using the USDA FoodData Central
// database (free; get a key at https://fdc.nal.usda.gov/api-key-signup and set USDA_API_KEY).
// Each line ("2 tbsp olive oil") is split into amount, unit and food, the food is looked up,
// and its weight in grams is worked out from the unit or USDA's portion sizes.
// Lookups are cached in MongoDB, so each ingredient is only fetched from USDA once.

const FDC_URL = process.env.USDA_API_URL || "https://api.nal.usda.gov/fdc/v1";

// USDA nutrient ids -> our field names (sodium in mg, energy in kcal, the rest in grams)
const NUTRIENTS = {
  1008: "calories",
  1003: "protein",
  1004: "fat",
  1258: "saturatedFat",
  1005: "carbs",
  2000: "sugar",
  1079: "fiber",
  1093: "sodium",
};
const FIELDS = Object.values(NUTRIENTS);

const FRACTIONS = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅛": 0.125 };

// Units and how many grams (weight) or millilitres (volume) one of them is
const WEIGHT_UNITS = {
  g: 1, gr: 1, gram: 1, grams: 1, gramme: 1, grammes: 1,
  kg: 1000, kilo: 1000, kilos: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
};
const VOLUME_UNITS = {
  ml: 1, millilitre: 1, milliliter: 1, millilitres: 1, milliliters: 1,
  cl: 10, dl: 100,
  l: 1000, litre: 1000, liter: 1000, litres: 1000, liters: 1000,
  tsp: 4.93, teaspoon: 4.93, teaspoons: 4.93,
  tbsp: 14.79, tbs: 14.79, tablespoon: 14.79, tablespoons: 14.79,
  cup: 240, cups: 240,
};
// Volume units USDA lists portions for, so e.g. "1 cup flour" uses flour's real weight
const VOLUME_PORTION_WORDS = { tsp: /\b(tsp|teaspoon)/, tbsp: /\b(tbsp|tablespoon)/, cup: /\bcup\b/ };
const COUNT_UNITS = {
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  tin: "tin", tins: "tin", can: "tin", cans: "tin",
  pinch: "pinch", pinches: "pinch",
  handful: "handful", handfuls: "handful",
  bunch: "bunch", bunches: "bunch",
  sprig: "sprig", sprigs: "sprig",
  knob: "knob", knobs: "knob",
  stick: "stick", sticks: "stick",
  sheet: "sheet", sheets: "sheet",
  large: "large", medium: "medium", small: "small",
};
// Typical weights when USDA has no matching portion
const DEFAULT_GRAMS = { tin: 400, pinch: 0.4, handful: 30, bunch: 25, sprig: 1, knob: 15, stick: 113, sheet: 30, slice: 30, clove: 3 };

// Words that describe preparation rather than the food itself
const PREPARATION = /\b(fresh(ly)?|finely|roughly|thinly|chopped|diced|sliced|minced|grated|crushed|peeled|halved|quartered|softened|melted|lukewarm|warm|cold|room temperature|beaten|sifted|packed|heaped|level|rounded|large|medium|small|good quality|optional|about|approx(imately)?|plus extra|to serve|for serving|for garnish|to taste)\b/g;

function parseNumber(text) {
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const withSymbol = text.match(/^(\d*)\s*([½⅓⅔¼¾⅛])$/);
  if (withSymbol) return Number(withSymbol[1] || 0) + FRACTIONS[withSymbol[2]];
  return Number(text.replace(",", "."));
}

// "2 1/2 tbsp olive oil, plus extra" -> { amount: 2.5, unit: "tbsp", name: "olive oil" }
function parseIngredient(line) {
  let text = line
    .replace(/^([-*•]|\d+[.)])\s+/, "")
    .replace(/\([^)]*\)/g, " ")
    .trim();
  const lower = text.toLowerCase();
  const toTaste = /\b(to taste|for serving|to serve|for garnish|optional)\b/.test(lower);

  let amount = null;
  const number = text.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\s*[½⅓⅔¼¾⅛]|\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(?:x\s+)?/i,
  );
  if (number) {
    amount = parseNumber(number[1].trim());
    // "2-3 carrots" -> 2.5
    if (number[2]) amount = (amount + Number(number[2].replace(",", "."))) / 2;
    text = text.slice(number[0].length);
    // "1 x 400g tin chickpeas" -> 400 g
    const packSize = text.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b\.?\s*(?:tins?|cans?|packs?|packets?|jars?|bags?|tubs?|blocks?)?\s*(?:of\s+)?/i);
    if (packSize) {
      const size = Number(packSize[1].replace(",", "."));
      const unitName = packSize[2].toLowerCase();
      text = text.slice(packSize[0].length);
      if (WEIGHT_UNITS[unitName]) {
        return finish(text, amount * size, { kind: "weight", name: unitName, grams: WEIGHT_UNITS[unitName] }, toTaste);
      }
      return finish(text, amount * size, { kind: "volume", name: unitName, ml: VOLUME_UNITS[unitName] }, toTaste);
    }
  }

  let unit = null;
  const word = text.match(/^(fl\.?\s*oz|[a-zA-Z]+)\.?(?=\s|$)\s*(?:of\s+)?/i);
  if (word) {
    const candidate = word[1].toLowerCase().replace(/\s+/g, " ");
    if (/^fl\.? ?oz$/.test(candidate)) unit = { kind: "volume", name: "floz", ml: 29.57 };
    else if (WEIGHT_UNITS[candidate]) unit = { kind: "weight", name: candidate, grams: WEIGHT_UNITS[candidate] };
    else if (VOLUME_UNITS[candidate]) {
      const name = Object.keys(VOLUME_PORTION_WORDS).find((key) => VOLUME_UNITS[key] === VOLUME_UNITS[candidate]) || candidate;
      unit = { kind: "volume", name, ml: VOLUME_UNITS[candidate] };
    } else if (COUNT_UNITS[candidate]) unit = { kind: "count", name: COUNT_UNITS[candidate] };
    if (unit) text = text.slice(word[0].length);
  }
  // "3 garlic cloves", "2 bread slices": the unit can come after the food
  if (!unit) {
    const after = text.match(/\b(cloves?|slices?|sprigs?|tins?|cans?|sheets?|sticks?)\b/i);
    if (after) {
      unit = { kind: "count", name: COUNT_UNITS[after[1].toLowerCase()] };
      text = text.replace(after[0], " ");
    }
  }
  return finish(text, amount, unit, toTaste);
}

function finish(text, amount, unit, toTaste) {
  const name = text
    .split(",")[0]
    .toLowerCase()
    .replace(PREPARATION, " ")
    .replace(/[^a-zÀ-ɏ' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { amount, unit, name, toTaste };
}

// ---- USDA lookups (cached) ----

let cacheCollection = null;
function cache(db) {
  cacheCollection ??= db.collection("nutritionCache");
  return cacheCollection;
}

async function fdc(path, params = {}) {
  const url = new URL(`${FDC_URL}${path}`);
  url.searchParams.set("api_key", process.env.USDA_API_KEY || "DEMO_KEY");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (response.status === 429) {
    const error = new Error("USDA rate limit reached");
    error.status = 429;
    throw error;
  }
  if (!response.ok) throw new Error(`USDA request failed (${response.status})`);
  return response.json();
}

// Ranks USDA results: plain ingredients first, brands, fast food and baby food last
function rankHits(name, foods) {
  const words = name.split(" ").filter((w) => w.length > 2);
  const cooked = /\b(cooked|boiled|roasted|fried|baked|grilled|canned|tinned|dried)\b/.test(name);
  return foods
    .map((food, position) => {
      const description = food.description;
      const lower = description.toLowerCase();
      let score = -position;
      if (/^[A-Z0-9'&.\- ]{4,},/.test(description)) score -= 30; // brand names are written in capitals
      if (/^(fast foods|restaurant|babyfood|snacks|school lunch|formulated)/i.test(description)) score -= 30;
      const firstPart = lower.split(",")[0];
      if (words.some((w) => firstPart.includes(w.replace(/e?s$/, "")))) score += 10;
      if (!cooked && /\braw\b/.test(lower)) score += 4;
      if (!cooked && /\b(cooked|boiled|fried|canned)\b/.test(lower)) score -= 2;
      return { food, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ food }) => ({ fdcId: food.fdcId, description: food.description }));
}

async function searchFoods(db, name) {
  const key = `search:${name}`;
  const cached = await cache(db).findOne({ _id: key });
  if (cached) return cached.hits;
  const result = await fdc("/foods/search", { query: name, dataType: "SR Legacy", pageSize: 12 });
  const hits = rankHits(name, result.foods || []).slice(0, 8);
  await cache(db).updateOne({ _id: key }, { $set: { hits, at: new Date() } }, { upsert: true });
  return hits;
}

async function foodDetails(db, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const found = new Map();
  const cached = await cache(db).find({ _id: { $in: unique.map((id) => `food:${id}`) } }).toArray();
  for (const doc of cached) found.set(doc.fdcId, doc);

  const missing = unique.filter((id) => !found.has(id));
  for (let i = 0; i < missing.length; i += 20) {
    const foods = await fdc("/foods", { fdcIds: missing.slice(i, i + 20).join(",") });
    for (const food of foods) {
      const per100 = Object.fromEntries(FIELDS.map((field) => [field, 0]));
      for (const n of food.foodNutrients || []) {
        const field = NUTRIENTS[n.nutrient?.id ?? n.nutrientId];
        if (field) per100[field] = n.amount ?? n.value ?? 0;
      }
      const portions = (food.foodPortions || [])
        .filter((p) => p.gramWeight > 0)
        .map((p) => ({
          text: [p.modifier, p.portionDescription, p.measureUnit?.name]
            .filter((t) => t && t !== "undetermined")
            .join(" ")
            .toLowerCase(),
          grams: p.gramWeight / (p.amount || 1),
        }));
      const doc = { _id: `food:${food.fdcId}`, fdcId: food.fdcId, description: food.description, per100, portions, at: new Date() };
      await cache(db).updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
      found.set(food.fdcId, doc);
    }
  }
  return found;
}

// Grams for one line, using USDA's portion sizes where they fit the unit
function gramsFor(parsed, food) {
  const amount = parsed.amount ?? 1;
  const { unit } = parsed;
  const portions = food?.portions || [];
  const portion = (pattern) => portions.find((p) => pattern.test(p.text));

  if (unit?.kind === "weight") return { grams: amount * unit.grams, guessed: false };
  if (unit?.kind === "volume") {
    const match = VOLUME_PORTION_WORDS[unit.name] && portion(VOLUME_PORTION_WORDS[unit.name]);
    if (match) return { grams: amount * match.grams, guessed: false };
    return { grams: amount * unit.ml, guessed: true };
  }
  if (unit?.kind === "count") {
    const match = portion(new RegExp(`\\b${unit.name}`));
    if (match) return { grams: amount * match.grams, guessed: false };
    if (DEFAULT_GRAMS[unit.name]) return { grams: amount * DEFAULT_GRAMS[unit.name], guessed: true };
  }
  // No amount at all ("Flaky sea salt", "Fresh basil"): usually seasoning or garnish
  if (parsed.amount === null && !unit) return { grams: 0, guessed: true };
  // "2 onions", "1 egg": a medium one, or the first single-item portion USDA lists
  const piece =
    portion(/\bmedium\b/) ||
    portion(/\b(whole|large|item|fruit|egg|piece)\b/) ||
    portions.find((p) => !/\b(cup|tbsp|tsp|tablespoon|teaspoon|oz|slice)\b/.test(p.text));
  if (piece) return { grams: amount * piece.grams, guessed: true };
  return { grams: amount * 100, guessed: true };
}

const round = (value, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits;

function summarise(totals, servings) {
  const result = {};
  for (const field of FIELDS) {
    const value = totals[field] / servings;
    result[field] = field === "calories" || field === "sodium" ? round(value) : round(value, 1);
  }
  return result;
}

// lines: the ingredient lines (headings already removed)
// overrides: { [index]: { fdcId?, grams?, skip? } } chosen by the writer
async function estimateNutrition(db, lines, servings, overrides = {}) {
  const parsed = lines.map((text) => ({ text, ...parseIngredient(text) }));
  const hits = await Promise.all(
    parsed.map((line, i) => (overrides[i]?.skip || !line.name ? [] : searchFoods(db, line.name))),
  );
  const chosen = parsed.map((_, i) => Number(overrides[i]?.fdcId) || hits[i][0]?.fdcId || null);
  const details = await foodDetails(db, chosen);

  const totals = Object.fromEntries(FIELDS.map((field) => [field, 0]));
  const results = parsed.map((line, i) => {
    const override = overrides[i] || {};
    const food = details.get(chosen[i]) || null;
    const base = { index: i, text: line.text, options: hits[i] };
    if (override.skip || !food) {
      return { ...base, food: null, grams: 0, calories: 0, skipped: true };
    }
    const estimate = gramsFor(line, food);
    const grams = Number.isFinite(Number(override.grams)) && override.grams !== "" && override.grams !== null
      ? Math.max(0, Number(override.grams))
      : estimate.grams;
    for (const field of FIELDS) totals[field] += (food.per100[field] || 0) * (grams / 100);
    return {
      ...base,
      food: { fdcId: food.fdcId, description: food.description },
      // Keep the chosen food in the list even when it came from somewhere else
      options: hits[i].some((h) => h.fdcId === food.fdcId) ? hits[i] : [{ fdcId: food.fdcId, description: food.description }, ...hits[i]],
      grams: round(grams),
      gramsGuessed: override.grams === undefined && estimate.guessed,
      calories: round(((food.per100.calories || 0) * grams) / 100),
      skipped: false,
    };
  });

  return { lines: results, servings, perServing: summarise(totals, servings) };
}

module.exports = { estimateNutrition, parseIngredient, FIELDS };
