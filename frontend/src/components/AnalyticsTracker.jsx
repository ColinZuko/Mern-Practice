import { Analytics } from "@vercel/analytics/react";
import { useLocation } from "react-router-dom";

// Group pages that differ only by an id, so the dashboard shows e.g. "/readblog/[id]"
const ROUTE_PATTERNS = [
  [/^\/readblog\/[^/]+$/, "/readblog/[id]"],
  [/^\/author\/[^/]+$/, "/author/[id]"],
  [/^\/edit-post\/[^/]+$/, "/edit-post/[id]"],
];

// The site uses "#/page" addresses, which Vercel would all count as the homepage.
// Report the real page instead, and drop everything after it: links from emails carry
// secret tokens (?token=...) that must never end up in the statistics.
function cleanUrl(event) {
  const path = window.location.hash.replace(/^#/, "").split("?")[0] || "/";
  return { ...event, url: window.location.origin + path };
}

// Vercel Web Analytics (cookie-free), with one page view per page the visitor opens
export function AnalyticsTracker() {
  const { pathname } = useLocation();
  // "/" only redirects to "/home"; counting it too would record every visit to the homepage twice
  if (pathname === "/") return <Analytics route={null} path={null} beforeSend={cleanUrl} />;
  const route = ROUTE_PATTERNS.find(([pattern]) => pattern.test(pathname))?.[1] || pathname;
  return <Analytics route={route} path={pathname} beforeSend={cleanUrl} />;
}
