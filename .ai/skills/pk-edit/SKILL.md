---
name: pk-edit
description: Change existing screens, components, data or styles of a mockup project with the smallest possible diff. Use for change requests on screens that are already built ("<project>: <change>").
argument-hint: "<slug> <change>"
---

# Edit

Input: `<slug>` and the change.

1. Read `projects/<slug>/README.md`. If the change contradicts it or the brief, point out the conflict and ask which wins.
2. Locate every affected place with search, across screens, `components.js`, the data files and the CSS. Read only those files.
3. Make the smallest change that does the job:
   - global visual change → `tokens.css` or the component, never each screen;
   - repeated markup → the component (with its COMPONENT INDEX line), not copies;
   - data change → the data file, so every screen showing it stays consistent.
4. `js/project.js`: `updated` today. A scope change, or anything that departs from the brief, gets a dated line under Decisions in the README. The brief is not edited.
5. `node scripts/pk.mjs check <slug>` must exit 0, with no warnings for this project.
6. Report in at most 4 lines: files changed, anything left open.
