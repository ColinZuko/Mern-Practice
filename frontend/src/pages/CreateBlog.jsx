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
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-10 border-b pb-6">
        <h1 className="text-4xl font-semibold">Write a recipe</h1>
        <p className="mt-2 text-muted-foreground">
          Fill in the template below. Your progress is saved in this browser as you type.
        </p>
      </header>
      <PostForm
        draftKey="pickleandpan:new-recipe-draft"
        submitLabel="Publish recipe"
        submittingLabel="Publishing…"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
