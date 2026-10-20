// Smooth scrolling, unless the visitor asked their system for reduced motion
export function scrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
