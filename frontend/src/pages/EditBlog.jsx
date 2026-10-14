import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getPost, updatePost } from "../api";
import { useAuth } from "../useAuth";
import { PostForm } from "../components/PostForm";
import { useSeo } from "../useSeo";

export function EditBlog() {
  useSeo({ title: "Edit recipe", noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [post, setPost] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setPost(await getPost(id));
      } catch (error) {
        console.error("Failed to load recipe for editing:", error);
        setFailed(true);
      }
    }
    load();
  }, [id]);

  async function handleSubmit(changes) {
    await updatePost(id, changes);
    navigate(`/recipe/${id}`);
  }

  if (failed) {
    return <p className="py-32 text-center text-muted-foreground">Couldn't load this recipe.</p>;
  }
  if (!post) {
    return <p className="py-32 text-center text-muted-foreground">Loading…</p>;
  }
  // The server enforces this too; this just avoids showing a form that can't be saved
  if (!canManage(post)) {
    return <Navigate to={`/recipe/${id}`} replace />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-4xl font-semibold">Edit recipe</h1>
        <p className="mt-2 text-muted-foreground">
          Update the details below. Leave the image alone to keep the current one.
        </p>
      </header>
      <PostForm
        initial={post}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
