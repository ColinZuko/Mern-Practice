import { useState } from "react";
import { ChefHat, Clock, Flame, Lightbulb, Users } from "lucide-react";
import {
  celsiusToFahrenheit,
  formatMinutes,
  hasRecipe,
  NUTRITION_FIELDS,
  nutritionValue,
  parseLines,
} from "../lib/recipes";

const DIFFICULTY_LABELS = { easy: "Easy", medium: "Medium", hard: "Challenging" };

function Fact({ icon, label, value, detail }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div>
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 font-medium">{value}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

// The "at a glance" bar: time, servings, oven temperature, difficulty
export function RecipeFacts({ recipe }) {
  const total = (Number(recipe.prepTime) || 0) + (Number(recipe.cookTime) || 0);
  const timeDetail = [
    recipe.prepTime && `Prep ${formatMinutes(recipe.prepTime)}`,
    recipe.cookTime && `Cook ${formatMinutes(recipe.cookTime)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    total > 0 && { icon: <Clock className="h-5 w-5" />, label: "Total time", value: formatMinutes(total), detail: timeDetail },
    recipe.servings && { icon: <Users className="h-5 w-5" />, label: "Serves", value: recipe.servings },
    recipe.ovenTemp && {
      icon: <Flame className="h-5 w-5" />,
      label: "Oven",
      value: `${recipe.ovenTemp}°C`,
      detail: `${celsiusToFahrenheit(recipe.ovenTemp)}°F · fan ${recipe.ovenTemp - 20}°C`,
    },
    recipe.difficulty && { icon: <ChefHat className="h-5 w-5" />, label: "Difficulty", value: DIFFICULTY_LABELS[recipe.difficulty] },
  ].filter(Boolean);

  if (facts.length === 0) return null;

  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <Fact key={fact.label} {...fact} />
      ))}
    </div>
  );
}

function Ingredients({ text }) {
  // Readers can tick off what they've already got out
  const [checked, setChecked] = useState({});
  const lines = parseLines(text);

  return (
    <ul className="space-y-1">
      {lines.map((line, i) =>
        line.type === "heading" ? (
          <li key={i} className="pb-1 pt-4 font-serif text-lg font-semibold first:pt-0">
            {line.text}
          </li>
        ) : (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className={checked[i] ? "text-muted-foreground line-through" : ""}>{line.text}</span>
            </label>
          </li>
        ),
      )}
    </ul>
  );
}

function Method({ text }) {
  // Number the steps; headings don't take a number
  const lines = parseLines(text);
  const stepNumbers = lines.map(
    (_, i) => lines.slice(0, i + 1).filter((l) => l.type === "item").length,
  );
  return (
    <ol className="space-y-6">
      {lines.map((line, i) => {
        if (line.type === "heading") {
          return (
            <li key={i} className="pt-2 font-serif text-xl font-semibold">
              {line.text}
            </li>
          );
        }
        return (
          <li key={i} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {stepNumbers[i]}
            </span>
            <p className="pt-0.5 text-lg leading-relaxed">{line.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

// Nutrition per serving, like the label on a pack
export function NutritionPanel({ nutrition }) {
  if (!nutrition) return null;
  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Nutrition per serving</h2>
        <p className="text-xs text-muted-foreground">An estimate, worked out from the ingredients</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
        {NUTRITION_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className={label.startsWith("of which") ? "pl-3" : ""}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={key === "calories" ? "text-2xl font-semibold" : "text-lg font-medium"}>
              {nutritionValue(nutrition, key)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const LEGACY_HEADING =
  /^(ingredients|instructions|method|directions|steps|preparation|notes|tips)\s*:?$/i;

// Older posts are one block of free text; give them headings and readable paragraphs
function LegacyBody({ text = "" }) {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (LEGACY_HEADING.test(line)) {
      flush();
      blocks.push({ type: "h", text: line.replace(/:$/, "") });
    } else if (!line) {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();

  return (
    <div className="mx-auto max-w-[68ch] space-y-5 text-lg leading-relaxed">
      {blocks.map((block, i) =>
        block.type === "h" ? (
          <h2 key={i} className="border-b pb-2 pt-6 text-2xl font-semibold first:pt-0">
            {block.text}
          </h2>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

// The body of a post: structured recipe layout, or the older free-text layout
export function RecipeContent({ post }) {
  const recipe = post.recipe;
  if (!hasRecipe(recipe)) return <LegacyBody text={post.content} />;

  const tips = parseLines(recipe.tips);

  return (
    <div className="space-y-12">
      {post.content?.trim() && (
        <div className="mx-auto max-w-[68ch] whitespace-pre-line text-lg leading-relaxed">
          {post.content}
        </div>
      )}

      <RecipeFacts recipe={recipe} />

      <div id="recipe" className="grid scroll-mt-24 gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {recipe.ingredients?.trim() && (
          <section className="self-start rounded-2xl bg-secondary/60 p-6 lg:sticky lg:top-24">
            <h2 className="mb-4 text-2xl font-semibold">Ingredients</h2>
            <Ingredients text={recipe.ingredients} />
          </section>
        )}
        {recipe.method?.trim() && (
          <section>
            <h2 className="mb-6 text-2xl font-semibold">Method</h2>
            <Method text={recipe.method} />
          </section>
        )}
      </div>

      <NutritionPanel nutrition={recipe.nutrition} />

      {tips.length > 0 && (
        <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
            <Lightbulb className="h-5 w-5 text-primary" /> Tips &amp; notes
          </h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            {tips.map((line, i) =>
              line.type === "heading" ? (
                <li key={i} className="list-none -ml-5 pt-2 font-semibold">{line.text}</li>
              ) : (
                <li key={i}>{line.text}</li>
              ),
            )}
          </ul>
        </aside>
      )}
    </div>
  );
}
