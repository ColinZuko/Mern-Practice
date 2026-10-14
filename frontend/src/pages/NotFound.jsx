import { Link } from "react-router-dom";
import { useSeo } from "../useSeo";

export function NotFound() {
  useSeo({ title: "Page not found", noindex: true });
  return (
    <div className="px-4 py-32 text-center">
      <p className="font-serif text-7xl font-semibold text-primary/30">404</p>
      <h1 className="mt-4 text-3xl font-semibold">This page isn't on the menu</h1>
      <p className="mt-2 text-muted-foreground">The link may be old, or the recipe was removed.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Back to the homepage
      </Link>
    </div>
  );
}
