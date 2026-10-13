import { useNavigate } from "react-router-dom";
import { createPost } from "../api";
import { PostForm } from "../components/PostForm";

export function CreateBlog() {
  const navigate = useNavigate();

  async function handleSubmit(post) {
    const response = await createPost(post);
    navigate(`/readblog/${response.data.insertedId}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-4xl font-semibold">Write a recipe</h1>
        <p className="mt-2 text-muted-foreground">
          Share a dish worth cooking: a great photo, a short summary and clear steps.
        </p>
      </header>
      <PostForm
        submitLabel="Publish recipe"
        submittingLabel="Publishing…"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
