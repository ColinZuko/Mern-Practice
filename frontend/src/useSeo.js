import { useEffect } from "react";
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, SITE_NAME, SITE_URL } from "./lib/seo";

// Updates a tag that's already in <head> (from index.html or the recipe-page function)
// instead of adding a second one; removes it when content is null.
function setTag(selector, create, attribute, value) {
  let element = document.head.querySelector(selector);
  if (value == null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

function setMeta(attr, key, content) {
  setTag(
    `meta[${attr}="${key}"]`,
    () => {
      const meta = document.createElement("meta");
      meta.setAttribute(attr, key);
      return meta;
    },
    "content",
    content,
  );
}

// Title, description, share preview and structured data for the current page.
// title: page name without the site name; path: canonical path (defaults to the current one);
// noindex: keep the page out of search results (account pages, search results, ...).
export function useSeo({ title, description, path, image, type = "website", noindex = false, structuredData } = {}) {
  const key = JSON.stringify({ title, description, path, image, type, noindex, structuredData });

  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const text = description || DEFAULT_DESCRIPTION;
    const url = SITE_URL + (path ?? window.location.pathname);

    document.title = fullTitle;
    setMeta("name", "description", text);
    setMeta("name", "robots", noindex ? "noindex, follow" : null);
    setTag(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        return link;
      },
      "href",
      noindex ? null : url,
    );
    setMeta("property", "og:type", type);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", text);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image || DEFAULT_IMAGE);

    let script = document.getElementById("structured-data");
    if (structuredData) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "structured-data";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    } else {
      script?.remove();
    }
    // `key` covers every option
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
