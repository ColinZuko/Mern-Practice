import { Analytics } from "@vercel/analytics/react";
import { useLocation } from "react-router-dom";

// Group pages that differ only by an id, so the dashboard shows e.g. "/recipe/[slug]"
const ROUTE_PATTERNS = [
  [/^\/recipe\/[^/]+$/, "/recipe/[slug]"],
  [/^\/author\/[^/]+$/, "/author/[id]"],
  [/^\/edit-post\/[^/]+$/, "/edit-post/[id]"],
];

// Drop everything after the path: links from emails carry secret tokens (?token=...)
// that must never end up in the statistics.
function cleanUrl(event) {
  return { ...event, url: window.location.origin + window.location.pathname };
}

// Vercel Web Analytics (cookie-free), with one page view per page the visitor opens
export function AnalyticsTracker() {
  const { pathname } = useLocation();
  // These only redirect somewhere else; counting them too would record visits twice
  if (pathname === "/home" || pathname.startsWith("/readblog/")) {
    return <Analytics route={null} path={null} beforeSend={cleanUrl} />;
  }
  const route = ROUTE_PATTERNS.find(([pattern]) => pattern.test(pathname))?.[1] || pathname;
  return <Analytics route={route} path={pathname} beforeSend={cleanUrl} />;
}
