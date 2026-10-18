import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyRating, rateRecipe, removeRating } from "../api";
import { useAuth } from "../useAuth";
import { BreadIcon } from "./BreadIcon";

const LABELS = ["", "Not for me", "It's okay", "Good", "Really good", "Absolutely loved it"];

// Five slices for an average: 4.3 shows as four toasted slices and one empty, 4.5 as four and a half
export function BreadRow({ average = 0, className = "h-5 w-5" }) {
  const rounded = Math.round(average * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground/40" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <BreadIcon
          key={n}
          className={className}
          variant={rounded >= n ? "full" : rounded >= n - 0.5 ? "half" : "empty"}
        />
      ))}
    </span>
  );
}

function ratingText(average, count) {
  return count ? `${average.toFixed(1)} out of 5 from ${count} ${count === 1 ? "rating" : "ratings"}` : "No ratings yet";
}

// Compact average for the top of a recipe
export function RatingSummary({ average, count }) {
  return (
    <a
      href="#rate"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById("rate")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      title={ratingText(average, count)}
    >
      <BreadRow average={average} className="h-5 w-5" />
      <span>
        {count ? (
          <>
            <span className="font-semibold text-foreground">{average.toFixed(1)}</span> ({count})
          </>
        ) : (
          "Be the first to rate"
        )}
      </span>
      <span className="sr-only">{ratingText(average, count)}</span>
    </a>
  );
}

// "Rate this recipe": pick 1-5 slices; change or remove your rating later
export function RateRecipe({ post, onChange }) {
  const { user, isLoggedIn, isVerified } = useAuth();
  const [mine, setMine] = useState({ postId: null, value: null });
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isAuthor = !!user && String(post.author) === user._id;
  const canRate = isLoggedIn && isVerified && !isAuthor;

  useEffect(() => {
    if (!canRate) return;
    let cancelled = false;
    getMyRating(post._id)
      .then((value) => !cancelled && setMine({ postId: post._id, value }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [post._id, canRate]);

  const myValue = mine.postId === post._id ? mine.value : null;
  const shown = hover || myValue || 0;

  async function save(value) {
    setSaving(true);
    setMessage("");
    try {
      const result = value ? await rateRecipe(post._id, value) : await removeRating(post._id);
      setMine({ postId: post._id, value: result.mine });
      onChange?.({ ratingAverage: result.ratingAverage, ratingCount: result.ratingCount });
      setMessage(value ? "Thanks for rating!" : "Your rating was removed.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Couldn't save your rating. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="rate" className="mx-auto mt-16 max-w-3xl scroll-mt-24 px-4 sm:px-6 print:hidden">
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center">
        <h2 className="text-2xl font-semibold">{isAuthor ? "Your recipe's rating" : "Rate this recipe"}</h2>
        <p className="text-sm text-muted-foreground">{ratingText(post.ratingAverage || 0, post.ratingCount || 0)}</p>

        {canRate ? (
          <>
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={myValue === n}
                  aria-label={`${n} out of 5: ${LABELS[n]}`}
                  title={LABELS[n]}
                  disabled={saving}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(0)}
                  onClick={() => save(n)}
                  className="rounded-lg p-1 text-muted-foreground/40 transition hover:scale-110 disabled:opacity-60 cursor-pointer"
                >
                  <BreadIcon className="h-9 w-9" variant={shown >= n ? "full" : "empty"} />
                </button>
              ))}
            </div>
            <p className="h-5 text-sm font-medium">{hover ? LABELS[hover] : myValue ? `You gave it ${myValue} out of 5` : ""}</p>
            {myValue && (
              <button
                type="button"
                onClick={() => save(null)}
                disabled={saving}
                className="text-xs text-muted-foreground underline hover:text-foreground cursor-pointer"
              >
                Remove my rating
              </button>
            )}
          </>
        ) : isAuthor ? (
          <BreadRow average={post.ratingAverage || 0} className="h-9 w-9" />
        ) : !isLoggedIn ? (
          <p className="text-sm">
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link> to rate this recipe.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Confirm your email address to rate recipes.</p>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </section>
  );
}
