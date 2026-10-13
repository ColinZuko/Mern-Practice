// A slice of bread, used for likes. Outline when not liked, toasted golden when liked.
export function BreadIcon({ filled = false, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* Crust */}
      <path
        d="M5.5 10.5C3.2 10.2 2.6 5.4 6.2 4.3 8 3.6 10 3.8 12 3.8s4-.2 5.8.5c3.6 1.1 3 5.9.7 6.2V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19z"
        fill={filled ? "#c98b45" : "none"}
        stroke={filled ? "#8a5a24" : "currentColor"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Soft inside of the slice */}
      {filled && (
        <path
          d="M7.4 11.4C6 11 6 7.4 8 6.6 9.3 6.1 10.7 6.2 12 6.2s2.7-.1 4 .4c2 .8 2 4.4.6 4.8V18a.6.6 0 0 1-.6.6H8a.6.6 0 0 1-.6-.6z"
          fill="#f3d9a4"
        />
      )}
    </svg>
  );
}
