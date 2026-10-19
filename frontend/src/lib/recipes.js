export const CUISINES = [
  "European",
  "USA",
  "African",
  "Asia",
  "Indian",
  "Italian",
  "Mediterranean",
  "Latin American",
  "Middle Eastern",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dessert",
  "Quick & Easy",
  "Healthy",
  "Comfort Food",
];

// Tags are stored lowercase; show them the way they appear in CUISINES
export function cuisineLabel(tag) {
  return CUISINES.find((c) => c.toLowerCase() === tag) || tag;
}

export function readingTime(text = "") {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// "just now", "5 minutes ago", "3 days ago", falling back to the date after a month
export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const ago = (amount, unit) => `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return ago(Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return ago(Math.floor(seconds / 3600), "hour");
  if (seconds < 30 * 86400) return ago(Math.floor(seconds / 86400), "day");
  return formatDate(value);
}

export const ROLE_LABELS = {
  admin: "Admin",
  editor: "Editor",
  user: "Reader",
};

export const DIFFICULTIES = ["easy", "medium", "hard"];

export function emptyRecipe() {
  return {
    prepTime: "",
    cookTime: "",
    servings: "",
    ovenTemp: "",
    difficulty: "",
    ingredients: "",
    method: "",
    tips: "",
    nutrition: null,
  };
}

// Nutrition per serving, in the order it's shown
export const NUTRITION_FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "sugar", label: "of which sugars", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "saturatedFat", label: "of which saturates", unit: "g" },
  { key: "fiber", label: "Fibre", unit: "g" },
  { key: "sodium", label: "Salt", unit: "g" },
];

// Shown as salt (like UK/EU labels): salt = sodium x 2.5
export function nutritionValue(nutrition, key) {
  if (key === "sodium") return Math.round((nutrition.sodium * 2.5) / 100) / 10;
  return key === "calories" ? Math.round(nutrition.calories) : Math.round(nutrition[key] * 10) / 10;
}

// "4", "4-6" or "12 cookies" -> 4, 5, 12
export function servingsNumber(servings) {
  const match = String(servings || "").match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!match) return null;
  return match[2] ? Math.round((Number(match[1]) + Number(match[2])) / 2) : Number(match[1]);
}

// True when a post uses the structured recipe template (newer posts)
export function hasRecipe(recipe) {
  return !!recipe && !!(recipe.ingredients?.trim() || recipe.method?.trim());
}

// Turns one-per-line text into items and group headings.
// A line ending in ":" or starting with "#" is a heading, e.g. "For the sauce:".
// Leading bullets ("-", "*", "•") and step numbers ("1.", "2)") are stripped.
export function parseLines(text = "") {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("#")) {
        return { type: "heading", text: line.replace(/^#+\s*/, "") };
      }
      if (line.endsWith(":")) {
        return { type: "heading", text: line.slice(0, -1) };
      }
      return { type: "item", text: line.replace(/^([-*•]|\d+[.)])\s*/, "") };
    });
}

export function countItems(text) {
  return parseLines(text).filter((line) => line.type === "item").length;
}

export function formatMinutes(minutes) {
  const total = Number(minutes);
  if (!total) return "";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function celsiusToFahrenheit(celsius) {
  return Math.round((Number(celsius) * 9) / 5 + 32);
}

// All the text in a post, for reading time and search
export function postText(post) {
  const r = post.recipe || {};
  return [post.content, r.ingredients, r.method, r.tips].filter(Boolean).join(" ");
}
