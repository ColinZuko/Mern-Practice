# Pickle & Pan

Recipe blog: React + Vite frontend (`frontend/`, on Vercel) and an Express + MongoDB API
(`backend/`, on Render at api.pickleandpan.com).

Backend tests: `cd backend && npm test` (node:test; each file uses its own throwaway `*_test`
database). They run on every push in GitHub Actions against a MongoDB container. Add a test
when you change an API route.

## Design standard

All UI work follows the **apple-design** skill in `.claude/skills/apple-design/` (Apple's Human
Interface Guidelines plus a craft lens).

- **Before** designing or changing UI: read `.claude/skills/apple-design/SKILL.md` and the
  always-load references it names (`accessibility.md`, `layout.md`, `typography.md`, `color.md`),
  plus the pages for what you are touching (buttons, forms, navigation, ...). Cite them in reviews.
- **After** a UI change: check it against the five lenses (accessibility, conventions, visual
  craft, interaction, writing) and fix Critical and High findings before calling it done.
- This is a **website**, so Apple's principles and foundations apply (accessibility, color,
  typography, layout, writing, interaction), not iOS/macOS-specific conventions such as tab bars
  or the menu bar.
- Hard floors: text contrast 4.5:1 (3:1 for large or bold text), body text 16px or larger on
  phones, tap targets 44×44px on mobile, visible keyboard focus, `prefers-reduced-motion`
  respected, nothing conveyed by colour alone, every icon-only button has an `aria-label`.
- Give numbers, not adjectives ("#8a8580 on #faf8f3 is 3.4:1"), and measure contrast from the
  real colour values.
- Keep the Pickle & Pan identity (berry `#4f1d3a`, Fraunces display type, warm paper background,
  the bread rating). The skill's own rule: guidelines make things usable, not identical, so don't
  flatten the brand into a template.
- Copy is in English and in sentence case, matching the existing site.
