import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { imageUrl } from "../api";
import { useAuth } from "../useAuth";
import { RecipeContent } from "./RecipeContent";
import { resizeImage } from "../lib/resizeImage";
import {
  celsiusToFahrenheit,
  countItems,
  CUISINES,
  emptyRecipe,
  formatMinutes,
  hasRecipe,
  postText,
  readingTime,
} from "../lib/recipes";

const MAX_FILE_SIZE = 30000000; // 30MB before shrinking
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const labelClass = "block text-sm font-medium";
const hintClass = "mt-1 text-xs text-muted-foreground";
const fieldClass =
  "mt-2 w-full rounded-xl border bg-background px-4 py-3 outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-ring/20";

const INGREDIENTS_PLACEHOLDER = `500g 00 flour
2 tsp instant yeast
2 tsp salt
420ml lukewarm water

For the topping:
3 tbsp olive oil
Flaky sea salt
Fresh rosemary`;

const METHOD_PLACEHOLDER = `Whisk the flour, yeast and salt in a large bowl, then stir in the water until a sticky dough forms.
Cover and leave to rest for 30 minutes, then stretch and fold the dough 3 or 4 times.
Oil a baking tray, tip the dough in and gently stretch it to the corners. Leave to rise for 1 hour.
Dimple the dough with oiled fingers, drizzle with olive oil and scatter over the salt and rosemary.
Bake for 25 minutes until golden, then cool on a rack for 10 minutes before slicing.`;

const TIPS_PLACEHOLDER = `Leave the dough in the fridge overnight for a deeper flavour.
Leftovers freeze well for up to a month.`;

// Each block of the form is a numbered card so the template is easy to follow
function Section({ number, title, description, children }) {
  return (
    <section className="rounded-2xl border bg-card p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {number}
        </span>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

// A number input with its unit shown inside the field
function UnitField({ id, label, unit, value, onChange, hint, max = 1000 }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} pr-14`}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm text-muted-foreground">
          {unit}
        </span>
      </div>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

// True when the draft has anything worth keeping
function hasDraftContent(draft) {
  if (!draft) return false;
  const r = draft.recipe || {};
  return [draft.title, draft.description, draft.content, r.ingredients, r.method, r.tips].some(
    (value) => typeof value === "string" && value.trim(),
  );
}

function readDraft(key) {
  if (!key) return null;
  try {
    const draft = JSON.parse(localStorage.getItem(key));
    return hasDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

// Shared by the create and edit pages. `initial` is the existing post when editing;
// `draftKey` turns on saving unfinished work in this browser (used when creating).
export function PostForm({ initial, draftKey, submitLabel, submittingLabel, onSubmit }) {
  const { user } = useAuth();
  const [draft] = useState(() => readDraft(draftKey));
  const start = draft || initial || {};
  const isLegacy = !!initial && !hasRecipe(initial.recipe) && !!initial.content?.trim();

  const [title, setTitle] = useState(start.title || "");
  const [description, setDescription] = useState(start.description || "");
  const [content, setContent] = useState(start.content || "");
  const [cuisines, setCuisines] = useState(start.cuisines || []);
  const [recipe, setRecipe] = useState(() => {
    // Empty numbers come back from the server as null; inputs need ""
    const saved = Object.fromEntries(
      Object.entries(start.recipe || {}).map(([key, value]) => [key, value ?? ""]),
    );
    return { ...emptyRecipe(), ...saved };
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(imageUrl(initial?.imageId));
  const [tab, setTab] = useState("write");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [draftRestored, setDraftRestored] = useState(!!draft);
  const inputFile = useRef(null);

  const setField = (field) => (value) => setRecipe((r) => ({ ...r, [field]: value }));

  // Free the temporary preview URL for local files
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Keep a copy of the text while writing, so a refresh or closed tab doesn't lose it
  useEffect(() => {
    if (!draftKey) return;
    const timer = setTimeout(() => {
      try {
        const current = { title, description, content, cuisines, recipe };
        if (hasDraftContent(current)) {
          localStorage.setItem(draftKey, JSON.stringify(current));
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch {
        // Storage can be unavailable (private mode); drafts just won't be kept
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftKey, title, description, content, cuisines, recipe]);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setTitle("");
    setDescription("");
    setContent("");
    setCuisines([]);
    setRecipe(emptyRecipe());
    setDraftRestored(false);
  }

  function toggleCuisine(cuisine) {
    const value = cuisine.toLowerCase();
    setCuisines((current) =>
      current.includes(value) ? current.filter((c) => c !== value) : [...current, value],
    );
  }

  async function handleFile(e) {
    const selected = e.target.files[0];
    if (!selected) return;

    const extension = selected.name.substring(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError("Please choose a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("That image is larger than 30MB.");
      e.target.value = "";
      return;
    }
    setError("");
    // Big phone photos are shrunk first so recipe pages load quickly on phones
    setPreparingPhoto(true);
    const resized = await resizeImage(selected);
    setPreparingPhoto(false);
    setFile(resized);
    setPreview(URL.createObjectURL(resized));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || preparingPhoto) return;
    if (!title.trim() || !description.trim()) {
      setTab("write");
      setError("Please add a title and a short summary.");
      return;
    }
    if (!file && !initial?.imageId) {
      setError("Please add a cover photo.");
      return;
    }
    if (!isLegacy && (!recipe.ingredients.trim() || !recipe.method.trim())) {
      setError("Please add the ingredients and the method.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({ title, description, content, cuisines, file, recipe });
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const ingredientCount = countItems(recipe.ingredients);
  const stepCount = countItems(recipe.method);
  const totalTime = (Number(recipe.prepTime) || 0) + (Number(recipe.cookTime) || 0);
  const draftPost = { title, description, content, cuisines, recipe };

  function tabClass(name) {
    return `rounded-full px-5 py-2 text-sm font-medium transition cursor-pointer ${
      tab === name ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    }`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border bg-card p-1">
          <button type="button" onClick={() => setTab("write")} className={tabClass("write")}>
            Write
          </button>
          <button type="button" onClick={() => setTab("preview")} className={tabClass("preview")}>
            Preview
          </button>
        </div>
        {draftKey && draftRestored && (
          <p className="text-sm text-muted-foreground">
            Restored your unfinished draft.{" "}
            <button type="button" onClick={discardDraft} className="font-medium text-primary hover:underline cursor-pointer">
              Start over
            </button>
          </p>
        )}
      </div>

      {tab === "preview" ? (
        <div className="rounded-2xl border bg-background p-6 sm:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{title || "Your recipe title"}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{description || "Your summary will appear here."}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {initial?.authorName || user?.name} · {readingTime(postText(draftPost))} min read
            </p>
          </div>
          {preview && (
            <img src={preview} alt="" className="mx-auto mt-8 aspect-[16/9] w-full max-w-4xl rounded-2xl object-cover" />
          )}
          <div className="mt-10">
            {hasRecipe(recipe) || content.trim() ? (
              <RecipeContent post={draftPost} />
            ) : (
              <p className="text-center text-muted-foreground">Add ingredients and steps to see the recipe here.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {isLegacy && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm leading-relaxed">
              <p className="font-medium">This recipe was written before the recipe template existed.</p>
              <p className="mt-1 text-muted-foreground">
                Its text is in the Intro field below and will keep showing as it does now. To get the new
                layout, move the ingredients and steps into their own fields and trim the intro.
              </p>
            </div>
          )}

          <Section number="1" title="The basics" description="What readers see on recipe cards and at the top of the page.">
            <div>
              <label htmlFor="title" className={labelClass}>Recipe title</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                placeholder="Rosemary focaccia"
                className={`${fieldClass} font-serif text-2xl`}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>Short summary</label>
              <input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                required
                placeholder="Crisp, bubbly and full of olive oil. Barely any kneading."
                className={fieldClass}
              />
              <p className={hintClass}>One sentence. {description.length}/200</p>
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
                          : "bg-background hover:border-primary hover:text-primary"
                      }`}
                    >
                      {cuisine}
                    </button>
                  );
                })}
              </div>
              <p className={hintClass}>The first one you pick is shown on the recipe card.</p>
            </div>

            <div>
              <span className={labelClass}>Cover photo</span>
              <button
                type="button"
                onClick={() => inputFile.current?.click()}
                className="group relative mt-2 block w-full overflow-hidden rounded-2xl border-2 border-dashed bg-background transition hover:border-primary cursor-pointer"
              >
                {preview ? (
                  <>
                    <img src={preview} alt="" className="aspect-[16/9] w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                      Change photo
                    </span>
                  </>
                ) : (
                  <span className="flex aspect-[16/9] flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm font-medium">Click to upload</span>
                    <span className="text-xs">JPG, PNG or WebP. Landscape works best; big photos are shrunk for you.</span>
                  </span>
                )}
              </button>
              {preparingPhoto && <p className={hintClass}>Preparing your photo…</p>}
              {draftRestored && !file && !preview && (
                <p className={hintClass}>Photos aren't saved in drafts, so please add it again.</p>
              )}
              <input
                type="file"
                ref={inputFile}
                onChange={handleFile}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
              />
            </div>
          </Section>

          <Section number="2" title="At a glance" description="Fill in what applies and leave the rest empty.">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <UnitField id="prepTime" label="Prep time" unit="min" value={recipe.prepTime} onChange={setField("prepTime")} max={10000} />
              <UnitField
                id="cookTime"
                label="Cook time"
                unit="min"
                value={recipe.cookTime}
                onChange={setField("cookTime")}
                max={10000}
                hint={totalTime > 0 ? `Total: ${formatMinutes(totalTime)}` : "Include baking, simmering and resting."}
              />
              <div>
                <label htmlFor="servings" className={labelClass}>Serves</label>
                <input
                  id="servings"
                  value={recipe.servings}
                  onChange={(e) => setField("servings")(e.target.value)}
                  maxLength={40}
                  placeholder="4, or 12 cookies"
                  className={fieldClass}
                />
              </div>
              <UnitField
                id="ovenTemp"
                label="Oven temperature"
                unit="°C"
                value={recipe.ovenTemp}
                onChange={setField("ovenTemp")}
                max={400}
                hint={
                  recipe.ovenTemp
                    ? `Shown as ${recipe.ovenTemp}°C · ${celsiusToFahrenheit(recipe.ovenTemp)}°F · fan ${recipe.ovenTemp - 20}°C`
                    : "Conventional oven. °F and fan are worked out for you."
                }
              />
              <div>
                <label htmlFor="difficulty" className={labelClass}>Difficulty</label>
                <select
                  id="difficulty"
                  value={recipe.difficulty}
                  onChange={(e) => setField("difficulty")(e.target.value)}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="">Not set</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Challenging</option>
                </select>
              </div>
            </div>
          </Section>

          <Section
            number="3"
            title="Ingredients"
            description="One ingredient per line. End a line with a colon to start a group, like “For the sauce:”."
          >
            <div>
              <textarea
                id="ingredients"
                aria-label="Ingredients"
                value={recipe.ingredients}
                onChange={(e) => setField("ingredients")(e.target.value)}
                maxLength={10000}
                placeholder={INGREDIENTS_PLACEHOLDER}
                className={`${fieldClass} min-h-[260px] leading-7`}
              />
              <p className={hintClass}>{ingredientCount} {ingredientCount === 1 ? "ingredient" : "ingredients"}</p>
            </div>
          </Section>

          <Section
            number="4"
            title="Method"
            description="One step per line. Steps are numbered for you, so no need to type 1, 2, 3."
          >
            <div>
              <textarea
                id="method"
                aria-label="Method"
                value={recipe.method}
                onChange={(e) => setField("method")(e.target.value)}
                maxLength={20000}
                placeholder={METHOD_PLACEHOLDER}
                className={`${fieldClass} min-h-[300px] leading-7`}
              />
              <p className={hintClass}>{stepCount} {stepCount === 1 ? "step" : "steps"}</p>
            </div>
          </Section>

          <Section number="5" title="Extras" description="Optional, but they make a recipe feel personal.">
            <div>
              <label htmlFor="content" className={labelClass}>Intro</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={10000}
                placeholder="Where this recipe comes from, why you love it, or when to make it."
                className={`${fieldClass} ${isLegacy ? "min-h-[320px]" : "min-h-[120px]"} leading-7`}
              />
              <p className={hintClass}>Shown above the recipe.</p>
            </div>
            <div>
              <label htmlFor="tips" className={labelClass}>Tips &amp; notes</label>
              <textarea
                id="tips"
                value={recipe.tips}
                onChange={(e) => setField("tips")(e.target.value)}
                maxLength={5000}
                placeholder={TIPS_PLACEHOLDER}
                className={`${fieldClass} min-h-[110px] leading-7`}
              />
              <p className={hintClass}>One tip per line: swaps, storage, make-ahead advice.</p>
            </div>
          </Section>
        </>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
        <p className="hidden text-sm text-muted-foreground sm:block">
          {ingredientCount} ingredients · {stepCount} steps
          {totalTime > 0 && ` · ${formatMinutes(totalTime)}`}
        </p>
        <div className="flex gap-2">
          {tab === "write" ? (
            <button type="button" onClick={() => setTab("preview")} className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted cursor-pointer">
              Preview
            </button>
          ) : (
            <button type="button" onClick={() => setTab("write")} className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted cursor-pointer">
              Keep editing
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
