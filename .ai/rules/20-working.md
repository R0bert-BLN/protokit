# 20 — Working method and knowledge base

## Reading (tokens are the main cost)
- Project `README.md`: in full before any change to the project. Do not ask what it or the brief already answers.
- Brief: in full only in `pk-init`. To build a module, `node scripts/pk.mjs context <name> <n>` prints everything needed (screens and status, data file, component index, shared brief sections, the module section); read nothing else of the brief.
- Components: the COMPONENT INDEX at the top of `js/components.js`, not the whole file.
- Other files: only those being changed; locate usages with search, never by reading every screen.

## Writing
- Deterministic work goes through the CLI and copies: `node scripts/pk.mjs …`, `cp screens/_screen.html screens/<id>.html`. Never write by hand what a command or a copy produces.
- Edit incrementally; never regenerate a whole file to change a few lines.
- Comments only for what is not obvious. No large code in the chat; it goes into files.
- COMPONENT INDEX: one line per function, at most 100 characters (call, use); parameter details go in a comment above the function.

## Asking versus deciding
- Ask only when the answer changes the structure (device, language, screen list, stack) and is in neither the README nor the brief.
- Otherwise decide, record the decision in the README, and continue.
- Stop at the checkpoints: brief confirmation, visual approval of the first screen, end of each module (unless told to continue without stopping), plan review before pushing to the board.

## Project knowledge base
- `README.md` (template `.ai/templates/project/README.md`; keep its section order). English, short, factual, one line per item:
  - **Decisions**: every non-trivial choice made without asking (palette tweak, navigation pattern, scope cut), dated, with the reason. A decision that replaces an earlier one replaces its line. Scope changes go here; the brief is never edited after creation.
  - **Open questions**: what blocks or could change the design. Remove when answered; the answer goes to Decisions.
- `js/project.js`: `status`, `updated` (today's date whenever the project changes) and the screen status (`built: true`). The hubs and `hub/site.js` read them; nothing is repeated elsewhere.
- History is git: no changelog in the README.
- Updated in the same change as the code. `pk check` warns when `updated` is behind.

## Mockup performance
- Images: SVG for icons and illustrations, WebP/JPEG ≤ 200 KB for photos, explicit `width`/`height`; no file over 500 KB.
- Maps, video and camera are CSS/SVG placeholders. Charts are small inline SVG.
- One font family, `display=swap`, only the weights used. No polling, no large libraries for small effects.
