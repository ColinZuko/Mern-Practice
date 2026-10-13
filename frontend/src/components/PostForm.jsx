import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { imageUrl } from "../api";
import { useAuth } from "../useAuth";
import { CUISINES, readingTime } from "../lib/recipes";

const MAX_FILE_SIZE = 15000000; // 15MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const labelClass = "block text-xs font-semibold uppercase tracking-widest text-muted-foreground";
const fieldClass =
  "mt-2 w-full rounded-xl border bg-card px-4 py-3 outline-none transition focus:ring-2 focus:ring-ring/30";

// Shared by the create and edit pages. `initial` is the existing post when editing.
export function PostForm({ initial, submitLabel, submittingLabel, onSubmit }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [content, setContent] = useState(initial?.content || "");
  const [cuisines, setCuisines] = useState(initial?.cuisines || []);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(imageUrl(initial?.imageId));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputFile = useRef(null);

  // Free the temporary preview URL for local files
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function toggleCuisine(cuisine) {
    const value = cuisine.toLowerCase();
    setCuisines((current) =>
      current.includes(value) ? current.filter((c) => c !== value) : [...current, value],
    );
  }

  function handleFile(e) {
    const selected = e.target.files[0];
    if (!selected) return;

    const extension = selected.name.substring(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError("Please choose a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("That image is larger than 15MB.");
      e.target.value = "";
      return;
    }
    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!file && !initial?.imageId) {
      setError("Please add a cover image.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({ title, description, content, cuisines, file });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-5">
      <form onSubmit={handleSubmit} className="space-y-8 lg:col-span-3">
        <div>
          <label htmlFor="title" className={labelClass}>Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            placeholder="Creamy lemon garlic pasta"
            className={`${fieldClass} font-serif text-2xl`}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>Summary</label>
          <input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            required
            placeholder="One or two sentences that make people want to cook it"
            className={fieldClass}
          />
        </div>

        <div>
          <span className={labelClass}>Cuisines</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {CUISINES.map((cuisine) => {
              const selected = cuisines.includes(cuisine.toLowerCase());
              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition cursor-pointer ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:border-primary hover:text-primary"
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className={labelClass}>Cover image</span>
          <button
            type="button"
            onClick={() => inputFile.current?.click()}
            className="group relative mt-2 block w-full overflow-hidden rounded-2xl border-2 border-dashed bg-card transition hover:border-primary cursor-pointer"
          >
            {preview ? (
              <>
                <img src={preview} alt="" className="aspect-[16/10] w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                  Change image
                </span>
              </>
            ) : (
              <span className="flex aspect-[16/10] flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">Click to upload</span>
                <span className="text-xs">JPG, PNG or WebP, up to 15MB</span>
              </span>
            )}
          </button>
          <input
            type="file"
            ref={inputFile}
            onChange={handleFile}
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp"
          />
        </div>

        <div>
          <label htmlFor="content" className={labelClass}>Ingredients & method</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={10000}
            required
            placeholder={"Ingredients\n- 200g pasta\n- 2 lemons\n\nMethod\n1. Bring a large pot of salted water to the boil…"}
            className={`${fieldClass} min-h-[320px] leading-relaxed`}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Line breaks are kept exactly as you type them. About {readingTime(content)} min read.
          </p>
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex items-center gap-3 border-t pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>

      {/* Live preview of how the card will look */}
      <aside className="space-y-3 lg:sticky lg:top-24 lg:col-span-2">
        <span className={labelClass}>Preview</span>
        <div className="rounded-2xl border bg-card p-5">
          {preview ? (
            <img src={preview} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
          ) : (
            <div className="aspect-[4/3] w-full rounded-xl bg-muted" />
          )}
          <div className="mt-4 space-y-2">
            {cuisines[0] && (
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {CUISINES.find((c) => c.toLowerCase() === cuisines[0])}
              </span>
            )}
            <h3 className="text-xl font-semibold leading-snug">{title || "Your recipe title"}</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description || "Your summary will appear here."}
            </p>
            <p className="text-xs text-muted-foreground">
              {initial?.authorName || user?.name} · {readingTime(content)} min read
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
