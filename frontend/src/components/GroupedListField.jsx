import { useLayoutEffect, useRef } from "react";
import { Heading } from "lucide-react";
import { parseLines } from "../lib/recipes";

// A one-item-per-line textarea (ingredients or method) with a button to add a group
// heading such as "For the sauce:". The groups found are listed underneath.
export function GroupedListField({ id, label, value, onChange, placeholder, exampleHeading, countLabel, className, maxLength }) {
  const textarea = useRef(null);
  const pendingSelection = useRef(null);
  const lines = parseLines(value);
  const groups = lines.filter((line) => line.type === "heading").map((line) => line.text);
  const count = lines.filter((line) => line.type === "item").length;

  // Select the new heading's name as soon as it's in the textarea, so typing replaces it
  useLayoutEffect(() => {
    const range = pendingSelection.current;
    if (!range || !textarea.current) return;
    pendingSelection.current = null;
    textarea.current.focus();
    textarea.current.setSelectionRange(range[0], range[1]);
  });

  function addHeading() {
    const field = textarea.current;
    const position = field ? field.selectionStart : value.length;
    const before = value.slice(0, position);
    const after = value.slice(position);
    // Put the heading on its own line, with a blank line before it when there's text above
    const prefix = before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const heading = `${exampleHeading}:`;
    const suffix = after.startsWith("\n") ? "" : "\n";
    const next = before + prefix + heading + suffix + after;
    const start = (before + prefix).length;
    pendingSelection.current = [start, start + exampleHeading.length];
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={addHeading}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:text-primary cursor-pointer"
        >
          <Heading className="h-3.5 w-3.5" /> Add group heading
        </button>
      </div>
      <textarea
        ref={textarea}
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className}
      />
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          {count} {count === 1 ? countLabel[0] : countLabel[1]}
        </span>
        {groups.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5">
            in {groups.length} {groups.length === 1 ? "group" : "groups"}:
            {groups.map((group, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {group}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
