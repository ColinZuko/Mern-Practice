import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { deletePost, getPosts } from "../api";
import { useAuth } from "../useAuth";
import { BlogCard } from "../components/BlogCard";
import { formatDate, initials, ROLE_LABELS } from "../lib/recipes";
import { useSeo } from "../useSeo";
import { YourData } from "../components/YourData";
import { EmailPreferences } from "../components/EmailPreferences";
import { useConfirm } from "../components/ConfirmDialog";

const ROLE_DESCRIPTIONS = {
  admin: "You can write recipes, edit or remove any post, and manage user roles.",
  editor: "You can write recipes and edit or remove your own posts.",
  user: "You can save recipes to come back to. Only editors can publish recipes.",
};

export function Profile() {
  useSeo({ title: "Your account", noindex: true });
  const { user, role, canWrite, isVerified, logout } = useAuth();
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState([]);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDialog, confirm] = useConfirm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setAllPosts(await getPosts());
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const savedIds = user.saved || [];
  const saved = allPosts.filter((post) => savedIds.includes(post._id));
  const mine = allPosts.filter((post) => post.author === user._id);

  async function handleDelete(post) {
    const ok = await confirm({
      title: `Delete “${post.title}”?`,
      message: "The recipe, its photo, comments and ratings are removed. This can't be undone.",
      confirmLabel: "Delete recipe",
    });
    if (!ok) return;
    setDeleteError("");
    const postId = post._id;
    try {
      await deletePost(postId);
      setAllPosts((posts) => posts.filter((post) => post._id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      setDeleteError("Couldn't delete the recipe. Check your connection and try again.");
    }
  }

  function handleLogout() {
    // Leave the page first, so account-only pages don't redirect to sign-in on the way out
    navigate("/");
    logout();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      {confirmDialog}
      {/* Account summary */}
      <header className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-center">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 font-serif text-3xl font-semibold text-primary">
          {initials(user.name)}
        </span>
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">{user.name}</h1>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {ROLE_LABELS[role]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {user.email}
            {!isVerified && <span className="font-medium text-warning-foreground"> (not confirmed yet)</span>}
            {user.joinDate && <> · Member since {formatDate(user.joinDate)}</>}
          </p>
          <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted sm:self-center cursor-pointer"
        >
          Log out
        </button>
      </header>

      {/* Published recipes (editors and admins) */}
      {canWrite && (
        <section className="pt-12">
          <div className="mb-8 flex items-end justify-between border-b pb-3">
            <h2 className="text-2xl font-semibold sm:text-3xl">Your recipes</h2>
            <Link to="/createblog" className="text-sm font-medium text-primary hover:underline">
              Write a new recipe
            </Link>
          </div>
          {deleteError && <p role="alert" className="mb-6 text-sm font-medium text-destructive">{deleteError}</p>}
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : mine.length === 0 ? (
            <p className="text-muted-foreground">You haven't published any recipes yet.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((post) => (
                <div key={post._id} className="flex flex-col">
                  <BlogCard post={post} />
                  <div className="mt-4 flex gap-2 border-t pt-4">
                    <Link
                      to={`/edit-post/${post._id}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Saved recipes */}
      <section className="pt-12">
        <h2 className="mb-8 border-b pb-3 text-2xl font-semibold sm:text-3xl">Saved recipes</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : saved.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing saved yet. Use the <span className="font-medium">Save recipe</span> button on
            any recipe to keep it here.
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </section>

      <EmailPreferences />

      <YourData />
    </div>
  );
}
