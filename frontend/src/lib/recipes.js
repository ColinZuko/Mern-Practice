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
