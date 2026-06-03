import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function About() {
  return (
    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center pt-24 pb-20 px-4 antialiased text-stone-900 bg-stone-50/30">
      {/* Centered Max-Width Bounds Wrapper */}
      <div className="w-full max-w-5xl mx-auto grid md:grid-cols-12 gap-12 items-center bg-white border border-stone-200/60 p-8 md:p-12 rounded-3xl shadow-md shadow-stone-200/40">
        {/* LEFT BLOCK: THE STORY CONTENT (Takes up 7 out of 12 columns) */}
        <div className="md:col-span-7 space-y-6 text-left">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Our Story
            </span>
            <h1 className="scroll-m-20 mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance text-primary">
              About Us
            </h1>
          </div>

          <div className="space-y-4 text-stone-600 leading-relaxed font-normal text-xs sm:text-sm 2xl:text-lg text-base">
            <p>
              Welcome to your new favorite culinary corner! This platform
              started as a school exercise for me to learn some new programming
              skills to log my favorite homemade recipes, daily kitchen
              insights, and food experiences, but as I worked I quickly saw the
              potential for this simple project to grow into something much
              bigger.
            </p>
            <p>
              Today, this space serves as a shared digital cookbook and a safe
              community haven where food lovers from all over the world can
              gather to showcase their unique roots, flavors, and experiments.
            </p>
            <p className="font-medium text-stone-800">
              Whether you're a seasoned chef or a home cook boiling your very
              first pot of pasta, feel free to pull up a chair, explore the
              collection, and contribute your own recipes!
            </p>
          </div>

          <div className="pt-4">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl tracking-wide px-8 py-6 shadow-md shadow-emerald-950/10 transition cursor-pointer"
            >
              <Link to="/createblog">Create a Recipe Post</Link>
            </Button>
          </div>
        </div>

        {/* RIGHT BLOCK: VISUAL CONTRAST PANEL (Takes up 5 out of 12 columns) */}
        <div className="md:col-span-5 w-full aspect-[4/5] bg-stone-100 rounded-2xl overflow-hidden relative border border-stone-200 shadow-inner group">
          <img
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"
            alt="Cooking workspace background"
            className="w-full h-full object-cover grayscale-[15%] group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-stone-950/10 to-transparent flex flex-col justify-end p-6 text-white pointer-events-none">
            <p className="font-serif text-lg font-bold">
              "Food tastes better when shared with others."
            </p>
            <span className="text-xs text-stone-200/80 font-mono mt-0.5">
              — Colin Delsink
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
