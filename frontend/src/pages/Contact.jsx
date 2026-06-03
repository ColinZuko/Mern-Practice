import { useState, useEffect } from "react";
import { getPosts } from "../api";
import { BlogCard } from "../components/BlogCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CUISINES = [
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

export function Contact() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch matching data whenever search inputs or tag selection arrays change
  useEffect(() => {
    async function fetchFilteredRecipes() {
      setLoading(true);
      try {
        // Call our updated API hook with current state states
        const data = await getPosts(search, selectedCuisine);
        data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        setPosts(data);
      } catch (err) {
        console.error("Failed to load recipes feed:", err);
      } finally {
        setLoading(false);
      }
    }

    // Add a slight debounce timer so we aren't spamming the backend database on every single keystroke
    const delayDebounce = setTimeout(() => {
      fetchFilteredRecipes();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, selectedCuisine]);

  return (
    <div className="w-full max-w-7xl mx-auto mt-24 px-4 sm:px-6 lg:px-8 space-y-10 pb-20 antialiased text-stone-900">
      {/* SEARCH & FILTERS CONTROLS HEADERS TRAY */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance text-primary">
          Explore Recipes
        </h1>

        {/* Text Input Search Field */}
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by keywords..."
          className="w-full bg-white border-stone-200 focus-visible:ring-ring rounded-xl py-6 shadow-sm"
        />

        {/* Cuisine Tags Bar Track */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button
            variant={selectedCuisine === "" ? "default" : "outline"}
            onClick={() => setSelectedCuisine("")}
            className={`rounded-full text-xs font-semibold px-4 py-1.5 cursor-pointer transition ${
              selectedCuisine === ""
                ? "bg-primary text-white"
                : "border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-700"
            }`}
          >
            All Kitchens
          </Button>

          {CUISINES.map((cuisine) => (
            <Button
              key={cuisine}
              onClick={() =>
                setSelectedCuisine(cuisine === selectedCuisine ? "" : cuisine)
              }
              className={`rounded-full text-xs font-semibold px-4 py-1.5 transition cursor-pointer border ${
                selectedCuisine === cuisine
                  ? "bg-primary text-white border-primary hover:bg-primary/90"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {cuisine}
            </Button>
          ))}
        </div>
      </div>

      {/* RESULTS RECIPES FEED GRID LAYOUT */}
      <div className="border-t border-stone-200/60 pt-10">
        {loading ? (
          <div className="text-center py-20 text-stone-400 font-medium">
            Searching our kitchen racks...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <p className="text-stone-500 font-serif text-lg font-medium">
              No recipes match your criteria.
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Try adjusting your spelling keywords or selecting another cuisine
              tag.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <BlogCard key={post._id || post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
