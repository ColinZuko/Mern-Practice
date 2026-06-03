import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, updatePost } from "../api"; // Ensure getPost (fetch single post) is in your api.js
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CUISINE_OPTIONS = [
  "European",
  "USA",
  "African",
  "Asia",
  "Indian",
  "Italian",
  "Mediterranean",
  "Latin American",
  "Middle Eastern",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dessert",
  "Quick & Easy",
  "Healthy",
  "Comfort Food",
];

export function EditBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inputFile = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Fetch current recipe data and pre-populate state configurations
  useEffect(() => {
    async function loadExistingRecipe() {
      try {
        const response = await getPost(id);

        const recipe = response.data ? response.data : response;

        if (!recipe) {
          throw new Error("Target recipe document returned blank.");
        }

        setTitle(recipe.title || "");
        setDescription(recipe.description || "");
        setContent(recipe.content || "");
        setSelectedCuisines(recipe.cuisines || []);
        if (recipe.imageUrl) setImagePreview(recipe.imageUrl);

        setLoading(false);
      } catch (err) {
        console.error("Failed to load recipe for editing:", err);
        alert("Could not load recipe data.");
        navigate("/profile");
      }
    }
    loadExistingRecipe();
  }, [id]);

  const handleTagClick = (cuisine) => {
    const normalized = cuisine.toLowerCase();
    if (selectedCuisines.includes(normalized)) {
      setSelectedCuisines(selectedCuisines.filter((c) => c !== normalized));
    } else {
      setSelectedCuisines([...selectedCuisines, normalized]);
    }
  };

  async function handlesubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let updatedObject = {
        title: title,
        description: description,
        content: content,
        cuisines: selectedCuisines,
        file: file, // If file is null, backend keeps existing imageId
      };

      await updatePost(id, updatedObject);
      alert("Recipe updated successfully!");
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="text-center mt-40 text-stone-500">
        Gathering recipe details...
      </div>
    );

  return (
    <div className="w-full max-w-6xl mx-auto mt-24 px-4 pb-20 antialiased text-stone-900">
      <div className="border-b border-stone-200 pb-4 mb-10">
        <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance text-primary">
          Edit Your Recipe
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Modify your ingredients, description summaries, or tags.
        </p>
      </div>

      <div className="flex justify-center w-full">
        <form
          onSubmit={handlesubmit}
          className="w-full max-w-3xl space-y-8 bg-white border border-stone-200/60 p-8 rounded-3xl shadow-sm"
        >
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="text-xs font-bold uppercase tracking-wider text-stone-500"
            >
              Recipe Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-stone-50/50 rounded-xl py-5"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-xs font-bold uppercase tracking-wider text-stone-500"
            >
              Short Summary
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-stone-50/50 rounded-xl py-5"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Cuisine Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((opt) => {
                const isSelected = selectedCuisines.includes(opt.toLowerCase());
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleTagClick(opt)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="content"
              className="text-xs font-bold uppercase tracking-wider text-stone-500"
            >
              Ingredients & Instructions
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="min-h-[250px] bg-stone-50/50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap"
            />
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm px-6 py-3 cursor-pointer"
            >
              {isSubmitting ? "Saving Changes..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/profile")}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm px-6 py-3"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
