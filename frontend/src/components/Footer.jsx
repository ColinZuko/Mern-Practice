import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { CUISINES } from "../lib/recipes";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-secondary/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/home" className="flex items-center gap-2.5">
            <Logo className="h-10 w-10" />
            <span className="font-serif text-2xl font-semibold">Pickle &amp; Pan</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Homemade recipes, kitchen notes and food stories. Savor every bite.
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Explore
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/home" className="hover:text-primary">Home</Link></li>
            <li><Link to="/recipes" className="hover:text-primary">All recipes</Link></li>
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Popular cuisines
          </h3>
          <ul className="space-y-2 text-sm">
            {CUISINES.slice(0, 5).map((cuisine) => (
              <li key={cuisine}>
                <Link
                  to={`/recipes?cuisine=${encodeURIComponent(cuisine.toLowerCase())}`}
                  className="hover:text-primary"
                >
                  {cuisine}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Pickle &amp; Pan. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
