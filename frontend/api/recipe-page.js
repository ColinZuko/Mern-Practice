// Serves /recipe/<slug> with the recipe's title, description, share image and structured
// data already in the HTML. Link previews (WhatsApp, Facebook, ...) don't run JavaScript,
// and search engines index pages faster when this is in the first response.
import {
  BACKEND_URL,
  describe,
  escapeHtml,
  idFromRecipeParam,
  jsonLdScript,
  recipeImage,
  recipePath,
  recipeStructuredData,
  recipeTitle,
  SITE_URL,
} from "../src/lib/seo.js";

const API_URL = process.env.VITE_API_URL || BACKEND_URL;

function seoBlock(post) {
  const url = SITE_URL + recipePath(post);
  const title = escapeHtml(recipeTitle(post));
  const description = escapeHtml(describe(post.description || post.content));
  const image = escapeHtml(recipeImage(post, API_URL));
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:site_name" content="Pickle &amp; Pan" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(post.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    jsonLdScript(recipeStructuredData(post, API_URL)),
  ].join("\n    ");
}

function replaceSeoBlock(html, block) {
  return html.replace(/<!-- seo:start[\s\S]*?<!-- seo:end -->/, block);
}

async function fetchWithTimeout(url, ms) {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const shell = await fetchWithTimeout(`${protocol}://${host}/index.html`, 5000).then((r) => r.text());

  const id = idFromRecipeParam(req.query.slug);
  let post = null;
  let status = 200;
  if (!id) {
    status = 404;
  } else {
    try {
      const response = await fetchWithTimeout(`${API_URL}/posts/${id}`, 8000);
      if (response.ok) post = await response.json();
      else if (response.status === 404 || response.status === 400) status = 404;
    } catch (error) {
      // Backend slow or unreachable: serve the normal page; the app loads the recipe itself
      console.error("Recipe lookup failed:", error.name);
    }
  }

  let html = shell;
  if (post) {
    html = replaceSeoBlock(shell, seoBlock(post));
  } else if (status === 404) {
    html = replaceSeoBlock(
      shell,
      `<title>Recipe not found — Pickle &amp; Pan</title>\n    <meta name="robots" content="noindex" />`,
    );
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache at Vercel's edge for 10 minutes, then refresh in the background
  res.setHeader("Cache-Control", post ? "public, s-maxage=600, stale-while-revalidate=86400" : "no-store");
  res.status(status).send(html);
}
