import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { CUISINES } from "../lib/recipes";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-secondary/60 print:hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
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
          <ul className="text-sm md:space-y-2">
            <li><Link to="/" className="inline-flex min-h-11 items-center hover:text-primary md:min-h-0">Home</Link></li>
            <li><Link to="/recipes" className="inline-flex min-h-11 items-center hover:text-primary md:min-h-0">All recipes</Link></li>
            <li><Link to="/about" className="inline-flex min-h-11 items-center hover:text-primary md:min-h-0">About</Link></li>
            <li><Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-primary md:min-h-0">Privacy</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Popular cuisines
          </h3>
          <ul className="text-sm md:space-y-2">
            {CUISINES.slice(0, 5).map((cuisine) => (
              <li key={cuisine}>
                <Link
                  to={`/recipes?cuisine=${encodeURIComponent(cuisine.toLowerCase())}`}
                  className="inline-flex min-h-11 items-center hover:text-primary md:min-h-0"
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
