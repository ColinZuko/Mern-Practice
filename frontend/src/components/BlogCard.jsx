import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { BreadRow } from "./BreadRating";
import { imageUrl } from "../api";
import { recipePath } from "../lib/seo";
import { cuisineLabel, formatDate, postText, readingTime } from "../lib/recipes";

// Waits between attempts when an image fails. The free backend can take up to a
// minute to wake up, so keep trying for about that long before giving up.
const RETRY_DELAYS_MS = [3000, 6000, 12000, 20000, 30000];

// Post cover image: retries while the backend wakes up, then falls back to a placeholder
export function PostImage({ post, className = "", eager = false }) {
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const baseSrc = imageUrl(post.imageId);
  // Only give up after the last retry has also failed
  const failed = attempt > RETRY_DELAYS_MS.length;

  // After a failed load, wait a bit and then try again
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setAttempt((n) => n + 1);
      setWaiting(false);
    }, RETRY_DELAYS_MS[attempt]);
    return () => clearTimeout(timer);
  }, [waiting, attempt]);

  function handleError() {
    if (attempt < RETRY_DELAYS_MS.length) setWaiting(true);
    else setAttempt(RETRY_DELAYS_MS.length + 1);
  }

  if (!baseSrc || failed) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground/50 ${className}`}>
        <ChefHat className="h-10 w-10" />
      </div>
    );
  }
  if (waiting) {
    return <div className={`animate-pulse bg-muted ${className}`} aria-label="Loading image" />;
  }
  // A changed URL makes the browser really ask again instead of reusing the failed attempt
  const src = attempt > 0 ? `${baseSrc}?retry=${attempt}` : baseSrc;
  return (
    <img
      src={src}
      alt={post.title}
      loading={eager ? "eager" : "lazy"}
      onError={handleError}
      className={`object-cover ${className}`}
    />
  );
}

function Eyebrow({ post }) {
  const tag = post.cuisines?.[0];
  if (!tag) return null;
  return (
    <span className="text-xs font-semibold uppercase tracking-widest text-primary">
      {cuisineLabel(tag)}
    </span>
  );
}

function Rating({ post }) {
  if (!post.ratingCount) return null;
  const average = post.ratingAverage.toFixed(1);
  return (
    <span className="inline-flex items-center gap-1.5">
      <BreadRow average={post.ratingAverage} className="h-3.5 w-3.5" />
      <span aria-hidden="true">{average}</span>
      <span className="sr-only">{`Rated ${average} out of 5`}</span>
    </span>
  );
}

function Meta({ post }) {
  return (
    <p className="flex flex-wrap items-center text-xs text-muted-foreground">
      {post.authorName || "Unknown author"}
      <span className="mx-1.5">·</span>
      {formatDate(post.dateCreated)}
      <span className="mx-1.5">·</span>
      {readingTime(postText(post))} min read
      {post.ratingCount > 0 && <span className="mx-1.5">·</span>}
      <Rating post={post} />
    </p>
  );
}

// variant: "default" (grid card), "feature" (large lead story), "compact" (small row)
export function BlogCard({ post, variant = "default", rank }) {
  const link = recipePath(post);

  if (variant === "feature") {
    return (
      <Link to={link} className="group block">
        <div className="overflow-hidden rounded-2xl">
          <PostImage
            post={post}
            eager
            className="aspect-[16/10] w-full transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-6 space-y-3">
          <Eyebrow post={post} />
          <h2 className="text-3xl font-semibold leading-tight text-balance group-hover:text-primary sm:text-4xl lg:text-5xl">
            {post.title}
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {post.description}
          </p>
          <Meta post={post} />
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link to={link} className="group flex items-start gap-4">
        {rank && (
          <span className="w-7 shrink-0 font-serif text-3xl font-semibold leading-none text-primary/60">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <Eyebrow post={post} />
          <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
            {post.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {post.authorName || "Unknown author"} · {post.views || 0} {post.views === 1 ? "view" : "views"}
            {post.ratingCount > 0 && <>{" · "}<Rating post={post} /></>}
          </p>
        </div>
        <div className="shrink-0 overflow-hidden rounded-lg">
          <PostImage post={post} className="h-20 w-20" />
        </div>
      </Link>
    );
  }

  return (
    <Link to={link} className="group flex h-full flex-col">
      <div className="overflow-hidden rounded-xl">
        <PostImage
          post={post}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-2">
        <Eyebrow post={post} />
        <h3 className="text-xl font-semibold leading-snug text-balance group-hover:text-primary">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {post.description}
        </p>
        <div className="mt-auto pt-2">
          <Meta post={post} />
        </div>
      </div>
    </Link>
  );
}
