import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useSeo } from "../useSeo";

export function About() {
  useSeo({ title: "About", description: "How Pickle & Pan started: a student's homemade recipes, kitchen notes and food stories, shared with friends, family and anyone who loves to cook." });
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="grid items-center gap-12 md:grid-cols-12">
        <div className="space-y-6 md:col-span-7">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            My story
          </span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            A student's passion for food and cooking, shared with the world
          </h1>

          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              This platform started as a school exercise for me to learn some
              new programming skills and log my favourite homemade recipes,
              daily kitchen insights and food experiences. As I worked on it, I
              thought it would be a shame to keep it to myself, so I decided to
              open it up to the public.
            </p>
            <p>
              Today it is my own digital cookbook, written by me along with a
              small team of editors and read by friends, family and anyone else
              who wants to explore the world of home cooking. It is a place
              where I can share my passion for food and cooking with others, and
              where I can learn from the experiences of others as well.
            </p>
            <p className="text-foreground">
              Whether you're a seasoned homecook or boiling your very first pot
              of pasta, pull up a chair and explore my collection.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/recipes"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Browse recipes <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-muted"
            >
              Create a free account
            </Link>
          </div>
        </div>

        <figure className="relative overflow-hidden rounded-3xl md:col-span-5">
          <img
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"
            alt="A kitchen counter with fresh ingredients"
            className="aspect-[4/5] w-full object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
            <p className="font-serif text-xl font-semibold">
              "Recipes taste better when shared with others."
            </p>
            <span className="mt-1 block text-sm text-white/75">
              — Colin Delsink
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
