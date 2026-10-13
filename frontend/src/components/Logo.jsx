// Placeholder Pickle & Pan mark: a pickle in a frying pan on a berry badge.
// Swap this component (and public/favicon.svg) for the real logo once it's designed.
export function Logo({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Pickle & Pan">
      <circle cx="32" cy="32" r="32" fill="#4f1d3a" />
      {/* Pan handle */}
      <line x1="38" y1="39" x2="51" y2="52" stroke="#f4ead8" strokeWidth="6" strokeLinecap="round" />
      {/* Pan */}
      <circle cx="27" cy="28" r="16" fill="#f4ead8" />
      <circle cx="27" cy="28" r="12" fill="#e4d3b4" />
      {/* Pickle */}
      <g transform="rotate(-35 27 28)">
        <rect x="17" y="23" width="20" height="10" rx="5" fill="#6b9a3c" />
        <circle cx="22" cy="26" r="1" fill="#4c7428" />
        <circle cx="27" cy="30" r="1" fill="#4c7428" />
        <circle cx="31" cy="26" r="1" fill="#4c7428" />
      </g>
    </svg>
  );
}
