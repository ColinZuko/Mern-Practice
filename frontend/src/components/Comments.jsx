import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Trash2 } from "lucide-react";
import { addComment, deleteComment, getComments } from "../api";
import { useAuth } from "../useAuth";
import { initials, timeAgo } from "../lib/recipes";

const MAX_LENGTH = 2000;

export function Comments({ post }) {
  const { user, isLoggedIn, isVerified, isAdmin } = useAuth();
  const [loaded, setLoaded] = useState({ postId: null, comments: [] });
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getComments(post._id)
      .then((comments) => !cancelled && setLoaded({ postId: post._id, comments }))
      .catch((err) => console.error("Failed to load comments:", err));
    return () => {
      cancelled = true;
    };
  }, [post._id]);

  const comments = loaded.postId === post._id ? loaded.comments : [];

  // The writer, the recipe's author, or an admin can remove a comment
  function canDelete(comment) {
    if (!user) return false;
    return isAdmin || comment.author === user._id || String(post.author) === user._id;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const comment = await addComment(post._id, text);
      setLoaded((current) => ({ ...current, comments: [...current.comments, comment] }));
      setText("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(comment) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(comment._id);
      setLoaded((current) => ({
        ...current,
        comments: current.comments.filter((c) => c._id !== comment._id),
      }));
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't delete the comment.");
    }
  }

  return (
    <section id="comments" className="mx-auto mt-20 max-w-3xl scroll-mt-24 px-4 sm:px-6 print:hidden">
      <h2 className="flex items-center gap-2 border-b pb-3 text-2xl font-semibold sm:text-3xl">
        <MessageCircle className="h-6 w-6 text-primary" />
        Comments
        <span className="font-sans text-base font-normal text-muted-foreground">({comments.length})</span>
      </h2>

      {/* Write a comment */}
      <div className="mt-6">
        {!isLoggedIn ? (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link> to join the
            conversation. Made this recipe? Tell us how it went!
          </p>
        ) : !isVerified ? (
          <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
            Confirm your email address to comment. Check your inbox for the link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(user.name)}
            </span>
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_LENGTH}
                rows={3}
                placeholder="Made it? Have a question or a tip? Share it here."
                aria-label="Write a comment"
                className="w-full rounded-xl border bg-card px-4 py-3 leading-relaxed outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-ring/20"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {error ? <span className="font-medium text-destructive">{error}</span> : `${text.length}/${MAX_LENGTH}`}
                </p>
                <button
                  type="submit"
                  disabled={posting || !text.trim()}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {posting ? "Posting…" : "Post comment"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* The conversation */}
      {comments.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {comments.map((comment) => {
            const byAuthor = comment.author === String(post.author);
            return (
              <li key={comment._id} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                  {initials(comment.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{comment.authorName}</span>
                    {byAuthor && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Author
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{timeAgo(comment.dateCreated)}</span>
                    {canDelete(comment) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment)}
                        aria-label="Delete comment"
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line leading-relaxed [overflow-wrap:anywhere]">{comment.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
