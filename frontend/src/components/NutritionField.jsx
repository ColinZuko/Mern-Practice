import { useEffect, useRef, useState } from "react";
import { Calculator, RefreshCw, Trash2 } from "lucide-react";
import { estimateNutrition } from "../api";
import { NUTRITION_FIELDS, servingsNumber } from "../lib/recipes";

// Stored units: sodium in mg (shown as salt in g), the rest as labelled
const INPUT_FIELDS = NUTRITION_FIELDS.map((field) =>
  field.key === "sodium" ? { ...field, label: "Sodium", unit: "mg" } : field,
);

const inputClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring/20";

// Works out nutrition per serving from the ingredient list (USDA data). The writer can pick
// a different food or correct the weight per line, then use the result.
function NutritionCalculator({ ingredients, servings, onUse, onCancel }) {
  const [portions, setPortions] = useState(servingsNumber(servings) || "");
  const [overrides, setOverrides] = useState({});
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    if (!portions) return;
    // Wait a moment after typing, and ignore answers to older requests
    const id = ++request.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setStatus("");
      try {
        const data = await estimateNutrition({ ingredients, servings: Number(portions), overrides });
        if (id === request.current) setResult(data);
      } catch (error) {
        if (id === request.current) setStatus(error.response?.data?.message || "Couldn't work out the nutrition.");
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [ingredients, portions, overrides]);

  const message = portions ? status : "Fill in how many servings the recipe makes.";
  const override = (index, change) => setOverrides((all) => ({ ...all, [index]: { ...all[index], ...change } }));

  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="block text-sm">
          <span className="font-medium">Servings</span>
          <input
            type="number"
            min="1"
            max="500"
            value={portions}
            onChange={(e) => setPortions(e.target.value)}
            className={`${inputClass} mt-1 w-28`}
          />
        </label>
        <p className="max-w-md text-xs text-muted-foreground">
          Check each line: pick a better match or fix the weight where needed. Weights marked ≈ are a guess.
          Lines without an amount (like “salt to taste”) count as 0 g.
        </p>
      </div>

      {result && (
        <div className={`mt-5 overflow-x-auto transition ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Ingredient</th>
                <th className="py-2 pr-3 font-medium">Matched with</th>
                <th className="py-2 pr-3 font-medium">Weight</th>
                <th className="py-2 text-right font-medium">kcal</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => (
                <tr key={line.index} className="border-b last:border-0">
                  <td className="py-2 pr-3 align-middle">{line.text}</td>
                  <td className="py-2 pr-3">
                    <select
                      value={line.skipped ? "skip" : line.food?.fdcId || "skip"}
                      onChange={(e) =>
                        e.target.value === "skip"
                          ? override(line.index, { skip: true })
                          : override(line.index, { skip: false, fdcId: Number(e.target.value), grams: undefined })
                      }
                      className={`${inputClass} max-w-[260px] cursor-pointer`}
                    >
                      {line.options.map((option) => (
                        <option key={option.fdcId} value={option.fdcId}>
                          {option.description}
                        </option>
                      ))}
                      <option value="skip">Don't count this</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    {!line.skipped && (
                      <div className="flex items-center gap-1">
                        {line.gramsGuessed && <span title="Estimated weight" className="text-amber-700">≈</span>}
                        <input
                          type="number"
                          min="0"
                          value={overrides[line.index]?.grams ?? line.grams}
                          onChange={(e) => override(line.index, { grams: e.target.value })}
                          className={`${inputClass} w-20`}
                        />
                        <span className="text-muted-foreground">g</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{line.skipped ? "–" : line.calories}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className="mt-4 text-sm font-medium text-destructive">{message}</p>}
      {!result && !message && <p className="mt-4 text-sm text-muted-foreground">Looking up your ingredients…</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm">
          {result && (
            <>
              <strong>{result.perServing.calories} kcal</strong> per serving · {result.perServing.protein} g protein ·{" "}
              {result.perServing.carbs} g carbs · {result.perServing.fat} g fat
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={!result || loading}
            onClick={() => onUse(result.perServing)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
          >
            Use these values
          </button>
        </div>
      </div>
    </div>
  );
}

// The Nutrition part of the recipe form
export function NutritionField({ value, onChange, ingredients, servings }) {
  const [calculating, setCalculating] = useState(false);
  const nutrition = value && typeof value === "object" ? value : null;
  const hasIngredients = !!ingredients?.trim();

  if (calculating) {
    return (
      <NutritionCalculator
        ingredients={ingredients}
        servings={servings}
        onCancel={() => setCalculating(false)}
        onUse={(values) => {
          onChange(values);
          setCalculating(false);
        }}
      />
    );
  }

  if (!nutrition) {
    return (
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {hasIngredients
            ? "Work out calories, protein, carbs and more per serving from your ingredient list."
            : "Add the ingredients first, then work out the nutrition from them."}
        </p>
        <button
          type="button"
          disabled={!hasIngredients}
          onClick={() => setCalculating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <Calculator className="h-4 w-4" /> Calculate nutrition
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {INPUT_FIELDS.map(({ key, label, unit }) => (
          <label key={key} className="block text-sm">
            <span className="text-muted-foreground">
              {label} ({unit})
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={nutrition[key] ?? ""}
              onChange={(e) => onChange({ ...nutrition, [key]: e.target.value === "" ? "" : Number(e.target.value) })}
              className={`${inputClass} mt-1`}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasIngredients}
          onClick={() => setCalculating(true)}
          className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Recalculate
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-3.5 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/5 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}
