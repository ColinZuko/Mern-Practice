import { useState } from "react";
import { Link } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { imageUrl } from "../api";
import { cuisineLabel, formatDate, postText, readingTime } from "../lib/recipes";

// Post cover image with a neutral placeholder when it's missing or fails to load
export function PostImage({ post, className = "", eager = false }) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(post.imageId);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground/50 ${className}`}>
        <ChefHat className="h-10 w-10" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={post.title}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
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

function Meta({ post }) {
  return (
    <p className="text-xs text-muted-foreground">
      {post.authorName || "Unknown author"}
      <span className="mx-1.5">·</span>
      {formatDate(post.dateCreated)}
      <span className="mx-1.5">·</span>
      {readingTime(postText(post))} min read
    </p>
  );
}

// variant: "default" (grid card), "feature" (large lead story), "compact" (small row)
export function BlogCard({ post, variant = "default", rank }) {
  const link = `/readblog/${post._id}`;

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
          <span className="w-7 shrink-0 font-serif text-3xl font-semibold leading-none text-primary/30">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <Eyebrow post={post} />
          <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
            {post.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {post.authorName || "Unknown author"} · {post.views || 0} views
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
