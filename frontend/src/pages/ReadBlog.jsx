import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, Clock, Eye, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { API_URL, deletePost, getPost, getPosts, logView } from "../api";
import { useSeo } from "../useSeo";
import { describe, idFromRecipeParam, recipeImage, recipePath, recipeStructuredData } from "../lib/seo";
import { useAuth } from "../useAuth";
import { BlogCard, PostImage } from "../components/BlogCard";
import { SaveButton } from "../components/SaveButton";
import { RecipeContent } from "../components/RecipeContent";
import { RateRecipe, RatingSummary } from "../components/BreadRating";
import { Comments } from "../components/Comments";
import { ShareMenu } from "../components/ShareMenu";
import { useConfirm } from "../components/ConfirmDialog";
import { scrollBehavior } from "../lib/motion";
import { cuisineLabel, formatDate, hasRecipe, initials, postText, readingTime } from "../lib/recipes";

export function ReadBlog() {
  // Addresses look like /recipe/rosemary-focaccia-<id>; only the id matters
  const { slugId } = useParams();
  const id = idFromRecipeParam(slugId);
  const location = useLocation();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  // Stored with the id it was loaded for, so an old recipe never shows while the next one loads
  const [loaded, setLoaded] = useState({ id: null, post: null, related: [], notFound: false });
  const [deleteError, setDeleteError] = useState("");
  const [confirmDialog, confirm] = useConfirm();
  const viewLogged = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!id) throw new Error("No recipe id in the address");
        const data = await getPost(id);
        if (cancelled) return;
        setLoaded({ id, post: data, related: [], notFound: false });

        // "More like this": same first cuisine, falling back to the newest posts
        const pool = await getPosts({ cuisine: data.cuisines?.[0] || "" });
        const others = pool.filter((p) => p._id !== data._id);
        const fallback = others.length >= 3 ? [] : (await getPosts()).filter(
          (p) => p._id !== data._id && !others.some((o) => o._id === p._id),
        );
        if (!cancelled) {
          setLoaded({ id, post: data, related: [...others, ...fallback].slice(0, 3), notFound: false });
        }
      } catch (error) {
        console.error("Failed to load recipe:", error);
        if (!cancelled) setLoaded({ id, post: null, related: [], notFound: true });
      }
    }
    load();

    // Count each visit once, even when React runs effects twice in development
    if (id && viewLogged.current !== id) {
      viewLogged.current = id;
      logView(id);
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = loaded.id === id ? loaded : { post: null, related: [], notFound: !id };
  const { related, notFound } = current;
  // A new rating updates the average shown on the page straight away
  const [ratingUpdate, setRatingUpdate] = useState({ id: null });
  const post = current.post && ratingUpdate.id === id ? { ...current.post, ...ratingUpdate.summary } : current.post;

  // Keep one address per recipe: add or update the title part (e.g. after the title was edited)
  const canonicalPath = post ? recipePath(post) : null;
  useEffect(() => {
    if (canonicalPath && location.pathname !== canonicalPath) {
      navigate(canonicalPath + location.search + location.hash, { replace: true });
    }
  }, [canonicalPath, location.pathname, location.search, location.hash, navigate]);

  useSeo(
    post
      ? {
          title: post.title,
          description: describe(post.description || post.content),
          path: canonicalPath,
          image: recipeImage(post, API_URL),
          type: "article",
          structuredData: recipeStructuredData(post, API_URL),
        }
      : { title: notFound ? "Recipe not found" : "Recipe", noindex: true },
  );

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete “${post.title}”?`,
      message: "The recipe, its photo, comments and ratings are removed. This can't be undone.",
      confirmLabel: "Delete recipe",
    });
    if (!ok) return;
    setDeleteError("");
    try {
      await deletePost(post._id);
      navigate("/");
    } catch (error) {
      console.error("Error deleting post:", error);
      setDeleteError("Couldn't delete the recipe. Check your connection and try again.");
    }
  }

  if (notFound) {
    return (
      <div className="py-32 text-center">
        <p className="font-serif text-3xl">Recipe not found</p>
        <Link to="/recipes" className="mt-4 inline-block text-primary hover:underline">
          Browse all recipes
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-16">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-12 w-full rounded bg-muted" />
        <div className="h-6 w-2/3 rounded bg-muted" />
        <div className="mt-10 aspect-[16/9] rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <article className="pb-8">
      {confirmDialog}
      <header className="mx-auto max-w-3xl px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {post.cuisines?.map((tag) => (
            <Link
              key={tag}
              to={`/recipes?cuisine=${encodeURIComponent(tag)}`}
              className="-my-3 inline-block py-3 text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
            >
              {cuisineLabel(tag)}
            </Link>
          ))}
        </div>

        <h1 className="mt-4 text-4xl font-semibold leading-tight text-balance sm:text-5xl lg:text-6xl">
          {post.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {post.description}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to={`/author/${post.author}`} className="flex items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(post.authorName)}
            </span>
            <span>
              <span className="block text-sm font-medium hover:text-primary">
                {post.authorName || "Unknown author"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDate(post.dateCreated)}
              </span>
            </span>
          </Link>
          <span className="hidden h-8 border-l sm:block" />
          <RatingSummary average={post.ratingAverage || 0} count={post.ratingCount || 0} />
          <span className="hidden h-8 border-l sm:block" />
          <span className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {readingTime(postText(post))} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {post.views || 0} {post.views === 1 ? "view" : "views"}
            </span>
          </span>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2 print:hidden">
          {hasRecipe(post.recipe) && (
            <a
              href="#recipe"
              onClick={(e) => {
                // Smooth scroll instead of jumping, and keep the address clean
                e.preventDefault();
                document.getElementById("recipe")?.scrollIntoView({ behavior: scrollBehavior() });
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <ArrowDown className="h-4 w-4" /> Jump to recipe
            </a>
          )}
          <SaveButton postId={post._id} />
          <ShareMenu
            title={post.title}
            className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition hover:bg-muted cursor-pointer"
          />
          {canManage(post) && (
            <>
              <Link
                to={`/edit-post/${post._id}`}
                className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition hover:bg-muted"
              >
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <Link
                to={`/pin/${post._id}`}
                className="inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition hover:bg-muted"
              >
                <ImagePlus className="h-4 w-4" /> Pinterest pin
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-destructive/30 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          )}
        </div>
        {deleteError && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{deleteError}</p>}
      </header>

      <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
        <PostImage post={post} eager className="aspect-[16/9] w-full rounded-2xl" />
      </div>

      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <RecipeContent post={post} />
      </div>

      <RateRecipe post={post} onChange={(summary) => setRatingUpdate({ id, summary })} />

      <Comments post={post} />

      {related.length > 0 && (
        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 print:hidden">
          <h2 className="mb-8 border-b pb-3 text-2xl font-semibold sm:text-3xl">More like this</h2>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
