import { useEffect, useRef, useState } from "react";
import { Check, Link2, Printer, Share2 } from "lucide-react";

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition hover:bg-muted cursor-pointer";

// One "Share" button instead of separate Copy link and Print buttons. Phones get the system
// share sheet (which also has copy and print); elsewhere a small menu opens.
export function ShareMenu({ title, className }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menu = useRef(null);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !menu.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function share() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ title, url: window.location.href });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    setOpen((o) => !o);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  }

  return (
    <div ref={menu} className="relative">
      <button type="button" onClick={share} aria-haspopup="menu" aria-expanded={open} className={className}>
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && (
        <div role="menu" className="absolute left-1/2 z-20 mt-2 w-48 -translate-x-1/2 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
          <button type="button" role="menuitem" onClick={copyLink} className={itemClass}>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.print();
            }}
            className={itemClass}
          >
            <Printer className="h-4 w-4" /> Print recipe
          </button>
        </div>
      )}
    </div>
  );
}
