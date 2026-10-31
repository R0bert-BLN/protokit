---
name: pk-check
description: Check a mockup project — repository checks, broken links, hard-coded colours, placeholders, status and hub in sync, console errors, accessibility basics — and fix what is found. Use before hand-over, after building screens, and inside pk-commit.
argument-hint: "[slug]"
---

# Check

Input: optionally `<slug>`; without it, the projects changed in `git status`.

## 1. Automatic
1. `node scripts/pk.mjs check [slug]` must exit 0. It regenerates the derived files (`hub/site.js`, agent adapters) and covers structure, shared files, links, colours, placeholders, status and `updated`, the COMPONENT INDEX, file sizes and secrets. Fix errors and warnings in the project(s) of the current task; for errors elsewhere, report and ask.
2. Console errors: with a browser tool (Playwright, Puppeteer, a browser extension), start `node scripts/pk.mjs serve <slug> --no-open` in the background, open the hub and every changed screen, and collect `console.error` and page errors. Without one, the report says "console not checked" instead of claiming a pass.

## 2. Manual, changed screens only (in the browser when one is available)
- Reachable from the hub and back; Run app steps through them in a sensible order (also with a phase selected); Esc returns to the hub.
- Readable in every theme; layout holds at 360, 390 and 430 px without horizontal scroll; the interactions the screens add work.
- Phase badge when the project is phased; legal note on legal, payment and privacy screens.
- Visible focus, touch targets ≥ 44 px, `alt` on images.

Report in at most 6 lines: passed, fixed, still open, not checked.
