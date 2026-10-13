import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getPosts, getTrendingPosts } from "../api";
import { BlogCard } from "../components/BlogCard";
import { CUISINES } from "../lib/recipes";
import { Logo } from "../components/Logo";

function SectionHeading({ title, link, linkText }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b pb-3">
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      {link && (
        <Link
          to={link}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {linkText} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <div className="aspect-[16/10] rounded-2xl bg-muted" />
        <div className="h-10 w-3/4 rounded bg-muted" />
        <div className="h-5 w-1/2 rounded bg-muted" />
      </div>
      <div className="space-y-6 lg:col-span-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function Home() {
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function loadPage() {
      try {
        const [allPosts, popular] = await Promise.all([
          getPosts(),
          getTrendingPosts(),
        ]);
        setPosts(allPosts);
        setTrending(popular);
      } catch (error) {
        console.error("Error loading home page:", error);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (failed) {
    return (
      <p className="py-32 text-center text-muted-foreground">
        We couldn't load the recipes right now. Please try again in a moment.
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="py-32 text-center text-muted-foreground">
        No recipes have been published yet.
      </p>
    );
  }

  // Posts come back newest first
  const [featured, ...rest] = posts;
  const latest = rest.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Lead story + most popular */}
      <section className="grid gap-12 py-10 lg:grid-cols-12 lg:py-14">
        <div className="lg:col-span-8">
          <BlogCard post={featured} variant="feature" />
        </div>

        <aside className="lg:col-span-4 lg:border-l lg:pl-10">
          <h2 className="mb-6 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Most popular
          </h2>
          <ol className="space-y-6">
            {trending.slice(0, 5).map((post, i) => (
              <li key={post._id} className="border-b pb-6 last:border-0">
                <BlogCard post={post} variant="compact" rank={i + 1} />
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* Browse by cuisine */}
      <section className="border-y py-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="shrink-0 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Browse
          </span>
          {CUISINES.map((cuisine) => (
            <Link
              key={cuisine}
              to={`/recipes?cuisine=${encodeURIComponent(cuisine.toLowerCase())}`}
              className="shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm transition hover:border-primary hover:text-primary"
            >
              {cuisine}
            </Link>
          ))}
        </div>
      </section>

      {/* Latest */}
      {latest.length > 0 && (
        <section className="pt-16">
          <SectionHeading title="Latest recipes" link="/recipes" linkText="View all" />
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* About band */}
      <section className="mt-20 grid items-center gap-8 rounded-3xl bg-primary px-8 py-12 text-primary-foreground sm:px-12 md:grid-cols-[auto_1fr]">
        <Logo className="h-24 w-24 rounded-full ring-4 ring-white/20" />
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold">Cooking at home, written down.</h2>
          <p className="max-w-2xl leading-relaxed text-primary-foreground/80">
            Pickle &amp; Pan is a growing collection of tried-and-tested recipes from
            our own kitchens. Create a free account to save your favourites.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-1 pt-1 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Read our story <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
