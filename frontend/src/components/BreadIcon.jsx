import { useId } from "react";

const CRUST =
  "M5.5 10.5C3.2 10.2 2.6 5.4 6.2 4.3 8 3.6 10 3.8 12 3.8s4-.2 5.8.5c3.6 1.1 3 5.9.7 6.2V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19z";
const CRUMB =
  "M7.4 11.4C6 11 6 7.4 8 6.6 9.3 6.1 10.7 6.2 12 6.2s2.7-.1 4 .4c2 .8 2 4.4.6 4.8V18a.6.6 0 0 1-.6.6H8a.6.6 0 0 1-.6-.6z";

function Toasted() {
  return (
    <>
      <path d={CRUST} fill="#c98b45" stroke="#8a5a24" strokeWidth="1.4" strokeLinejoin="round" />
      <path d={CRUMB} fill="#f3d9a4" />
    </>
  );
}

function Outline({ color = "currentColor" }) {
  return <path d={CRUST} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />;
}

// A slice of bread for ratings: "full" (toasted), "half" (with bites taken out) or "empty" (outline)
export function BreadIcon({ variant = "full", className = "h-5 w-5" }) {
  const maskId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {variant === "full" && <Toasted />}
      {variant === "empty" && <Outline />}
      {variant === "half" && (
        <>
          <defs>
            <mask id={maskId}>
              <rect width="24" height="24" fill="white" />
              {/* Bite marks on the right */}
              <circle cx="16.2" cy="5.2" r="2.6" fill="black" />
              <circle cx="14.6" cy="9.2" r="2.7" fill="black" />
              <circle cx="15.4" cy="13.6" r="2.7" fill="black" />
              <circle cx="14.4" cy="18.2" r="2.8" fill="black" />
              <rect x="15" width="12" height="24" fill="black" />
            </mask>
          </defs>
          <Outline />
          <g mask={`url(#${maskId})`}>
            <Toasted />
          </g>
        </>
      )}
    </svg>
  );
}
