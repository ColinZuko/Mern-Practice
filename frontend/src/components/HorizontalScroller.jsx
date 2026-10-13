import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A single row that scrolls sideways. Arrow buttons appear on hover (only on a side with
// more to show) and the edges fade out, so mouse users can reach items that don't fit.
// Touch users can still swipe.
export function HorizontalScroller({ children, className = "" }) {
  const rowRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    function update() {
      setEdges({
        left: row.scrollLeft > 4,
        right: row.scrollLeft + row.clientWidth < row.scrollWidth - 4,
      });
    }

    row.addEventListener("scroll", update, { passive: true });
    // Also runs once straight away, which sets the initial arrows
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function scrollBy(direction) {
    const row = rowRef.current;
    row.scrollBy({ left: direction * row.clientWidth * 0.7, behavior: "smooth" });
  }

  const arrowClass =
    "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-card shadow-md transition hover:border-primary hover:text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer";

  return (
    <div className={`group relative min-w-0 ${className}`}>
      <div
        ref={rowRef}
        className="flex items-center gap-3 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {edges.left && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll left" className={`${arrowClass} left-0`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}
      {edges.right && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
          <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll right" className={`${arrowClass} right-0`}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
