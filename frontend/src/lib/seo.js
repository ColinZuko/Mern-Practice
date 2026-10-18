// SEO helpers shared by the site and the Vercel functions in /api (so plain JS, no React).
import { cuisineLabel, hasRecipe, parseLines } from "./recipes.js";

export const SITE_URL = "https://pickleandpan.com";
export const SITE_NAME = "Pickle & Pan";
export const DEFAULT_TITLE = "Pickle & Pan — Homemade recipes, savor every bite";
export const DEFAULT_DESCRIPTION =
  "Tried-and-tested homemade recipes with clear ingredients, steps and cooking times. From weeknight pasta to weekend baking.";
export const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;
export const BACKEND_URL = "https://api.pickleandpan.com";

// "Rosemary Focaccia (Easy!)" -> "rosemary-focaccia-easy"; "Köfte" -> "kofte"
export function slugify(text = "") {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

// Readable recipe address that still contains the id: /recipe/rosemary-focaccia-6a16b9dc...
export function recipePath(post) {
  const slug = slugify(post.title);
  return `/recipe/${slug ? `${slug}-` : ""}${post._id}`;
}

// The id is always the last 24 characters of the address
export function idFromRecipeParam(param = "") {
  const match = String(param).match(/([0-9a-f]{24})$/i);
  return match ? match[1] : null;
}

// Short plain-text description for search results (Google shows ~155 characters)
export function describe(text = "", max = 155) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function recipeImage(post, apiUrl = BACKEND_URL) {
  // ?v= changes when the share image format changes, so apps fetch the new one instead of a cached copy
  return post.imageId ? `${apiUrl}/images/${encodeURIComponent(post.imageId)}/og?v=2` : DEFAULT_IMAGE;
}

export function recipeTitle(post) {
  return `${post.title} — ${SITE_NAME}`;
}

// 75 minutes -> "PT1H15M" (the duration format Google expects)
function isoDuration(minutes) {
  const total = Number(minutes);
  if (!total) return undefined;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `PT${hours ? `${hours}H` : ""}${mins ? `${mins}M` : ""}`;
}

// schema.org data that lets Google show recipes as rich results (photo, time, etc.)
export function recipeStructuredData(post, apiUrl = BACKEND_URL) {
  const url = SITE_URL + recipePath(post);
  const author = { "@type": "Person", name: post.authorName || SITE_NAME, url: post.author ? `${SITE_URL}/author/${post.author}` : undefined };
  const published = post.dateCreated ? new Date(post.dateCreated).toISOString() : undefined;
  const modified = post.dateUpdated ? new Date(post.dateUpdated).toISOString() : published;
  const image = [recipeImage(post, apiUrl)];

  // Older free-text posts don't have separate ingredients and steps, so describe them as an article
  if (!hasRecipe(post.recipe)) {
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image,
      author,
      datePublished: published,
      dateModified: modified,
      mainEntityOfPage: url,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    };
  }

  const r = post.recipe;
  const items = (text) => parseLines(text).filter((line) => line.type === "item").map((line) => line.text);
  const prep = Number(r.prepTime) || 0;
  const cook = Number(r.cookTime) || 0;

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: post.title,
    description: post.description,
    image,
    author,
    datePublished: published,
    dateModified: modified,
    url,
    prepTime: isoDuration(prep),
    cookTime: isoDuration(cook),
    totalTime: isoDuration(prep + cook),
    recipeYield: r.servings || undefined,
    recipeCuisine: (post.cuisines || []).map(cuisineLabel).join(", ") || undefined,
    keywords: (post.cuisines || []).map(cuisineLabel).join(", ") || undefined,
    recipeIngredient: items(r.ingredients),
    recipeInstructions: items(r.method).map((text) => ({ "@type": "HowToStep", text })),
    aggregateRating: post.ratingCount
      ? { "@type": "AggregateRating", ratingValue: post.ratingAverage, ratingCount: post.ratingCount, bestRating: 5, worstRating: 1 }
      : undefined,
  };
}

// Escapes text for use inside HTML attributes and elements
export function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// JSON-LD must not contain "</script>", so escape "<"
export function jsonLdScript(data) {
  return `<script type="application/ld+json" id="structured-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}
