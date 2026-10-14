import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuthor, getPosts } from "../api";
import { BlogCard } from "../components/BlogCard";
import { formatDate, initials, ROLE_LABELS } from "../lib/recipes";
import { useSeo } from "../useSeo";

export function Author() {
  const { id } = useParams();
  const [author, setAuthor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const [profile, authored] = await Promise.allSettled([
        getAuthor(id),
        getPosts({ author: id }),
      ]);
      const authoredPosts = authored.status === "fulfilled" ? authored.value : [];

      if (profile.status === "fulfilled") {
        setAuthor(profile.value);
      } else if (authoredPosts.length > 0) {
        // The account was removed but their recipes are still published
        setAuthor({ name: authoredPosts[0].authorName, removed: true });
      } else {
        console.error("Failed to load author:", profile.reason);
        setNotFound(true);
      }
      setPosts(authoredPosts);
    }
    load();
  }, [id]);

  useSeo({
    title: author ? `Recipes by ${author.name}` : "Author",
    description: author ? `All recipes by ${author.name} on Pickle & Pan.` : undefined,
    path: `/author/${id}`,
    noindex: notFound || posts.length === 0,
  });

  if (notFound) {
    return (
      <div className="py-32 text-center">
        <p className="font-serif text-3xl">Author not found</p>
        <Link to="/recipes" className="mt-4 inline-block text-primary hover:underline">
          Browse all recipes
        </Link>
      </div>
    );
  }

  if (!author) {
    return <p className="py-32 text-center text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 font-serif text-3xl font-semibold text-primary">
          {initials(author.name)}
        </span>
        <h1 className="mt-5 text-4xl font-semibold">{author.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {author.removed
            ? "Former contributor"
            : `${ROLE_LABELS[author.role]} · Member since ${formatDate(author.joinDate)}`}{" "}
          · {posts.length} {posts.length === 1 ? "recipe" : "recipes"}
        </p>
      </header>

      <section className="mt-14 border-t pt-10">
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground">No recipes published yet.</p>
        ) : (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
