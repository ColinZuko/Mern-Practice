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
  };
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
