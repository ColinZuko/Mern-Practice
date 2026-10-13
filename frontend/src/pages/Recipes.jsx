import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { getPosts } from "../api";
import { BlogCard } from "../components/BlogCard";
import { CUISINES } from "../lib/recipes";

export function Recipes() {
  // Search and cuisine live in the URL so results can be shared and the navbar search can link here
  const [params, setParams] = useSearchParams();
  const searchParam = params.get("q") || "";
  const cuisine = params.get("cuisine") || "";

  const [search, setSearch] = useState(searchParam);
  const [lastSearchParam, setLastSearchParam] = useState(searchParam);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Keep the input in sync when the URL changes (e.g. a new navbar search)
  if (searchParam !== lastSearchParam) {
    setLastSearchParam(searchParam);
    setSearch(searchParam);
  }

  const updateParams = useCallback(
    (changes) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Debounce typing so we don't hit the server on every keystroke
  useEffect(() => {
    if (search.trim() === searchParam) return;
    const timer = setTimeout(() => updateParams({ q: search.trim() }), 300);
    return () => clearTimeout(timer);
  }, [search, searchParam, updateParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getPosts({ search: searchParam, cuisine });
        if (!cancelled) setPosts(data);
      } catch (error) {
        console.error("Failed to load recipes:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [searchParam, cuisine]);

  function chipClass(active) {
    return `shrink-0 rounded-full border px-4 py-1.5 text-sm transition cursor-pointer ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "bg-card hover:border-primary hover:text-primary"
    }`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold sm:text-5xl">Recipes</h1>
        <p className="mt-3 text-muted-foreground">
          Search the whole collection, or narrow it down by cuisine.
        </p>
        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pasta, curry, chocolate…"
            className="h-14 w-full rounded-full border bg-card pl-12 pr-5 text-base shadow-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </header>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => updateParams({ cuisine: "" })} className={chipClass(!cuisine)}>
          All
        </button>
        {CUISINES.map((c) => {
          const value = c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => updateParams({ cuisine: cuisine === value ? "" : value })}
              className={chipClass(cuisine === value)}
            >
              {c}
            </button>
          );
        })}
      </div>

      <section className="mt-12 border-t pt-10">
        {loading ? (
          <div className="grid animate-pulse gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] rounded-xl bg-muted" />
                <div className="h-6 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl">No recipes found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search or pick another cuisine.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-8 text-sm text-muted-foreground">
              {posts.length} {posts.length === 1 ? "recipe" : "recipes"}
            </p>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post._id} post={post} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
