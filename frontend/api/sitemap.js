// /sitemap.xml: every public page and recipe, so Google finds new recipes quickly
import { BACKEND_URL, recipePath, SITE_URL } from "../src/lib/seo.js";
import { CUISINES } from "../src/lib/recipes.js";

const API_URL = process.env.VITE_API_URL || BACKEND_URL;

function entry(path, lastmod) {
  const loc = (SITE_URL + path).replace(/&/g, "&amp;");
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`;
}

export default async function handler(req, res) {
  let posts = [];
  try {
    const response = await fetch(`${API_URL}/posts`, { signal: AbortSignal.timeout(8000) });
    if (response.ok) posts = await response.json();
  } catch (error) {
    console.error("Sitemap: couldn't load recipes:", error.name);
  }

  const newest = posts.reduce((latest, p) => {
    const date = new Date(p.dateUpdated || p.dateCreated || 0);
    return date > latest ? date : latest;
  }, new Date(0));
  const authors = [...new Set(posts.map((p) => p.author).filter(Boolean))];
  const usedCuisines = CUISINES.filter((c) => posts.some((p) => (p.cuisines || []).includes(c.toLowerCase())));

  const urls = [
    entry("/", posts.length ? newest : null),
    entry("/recipes", posts.length ? newest : null),
    entry("/about"),
    ...usedCuisines.map((c) => entry(`/recipes?cuisine=${encodeURIComponent(c.toLowerCase())}`)),
    ...posts.map((p) => entry(recipePath(p), p.dateUpdated || p.dateCreated)),
    ...authors.map((a) => entry(`/author/${a}`)),
  ];

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", posts.length ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`);
}
