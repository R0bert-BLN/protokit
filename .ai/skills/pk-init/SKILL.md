---
name: pk-init
description: Create a mockup project from its brief (briefs/<slug>.md) and build its foundation — tokens, shell, navigation, shared components, shared data, README — without any screens. Use when a new mockup or project is requested.
argument-hint: "<slug> [idea]"
---

# Init: brief → foundation (no screens)

Input: `<slug>`, optionally an idea or a brief (text or file). Without a slug, propose one from the product name (lowercase `a-z 0-9 -`, unused in `projects/` and `briefs/`) and confirm it.

If `projects/<slug>/README.md` already exists, an earlier session started this: do only the steps still missing.

## 1. Brief
1. With a remote: `git pull --rebase --autostash`.
2. `briefs/<slug>.md` missing → with an idea or brief supplied, follow `.ai/skills/pk-brief/SKILL.md`; with nothing supplied, copy `briefs/_template.md` to it, ask for it to be filled in, and stop.
3. `node scripts/pk.mjs brief <slug>` must pass. Fix what the brief itself answers; ask about the rest (at most 3 questions at a time). Never set `status: Ready` without the user's confirmation.

## 2. Scaffold
`node scripts/pk.mjs init <slug>`: copies the template, generates `js/project.js` (every screen planned, `status: 'Brief'`) and the README, and adds the project to `hub/site.js`. Do not redo any of it by hand.

## 3. Foundation
Read the brief in full once. Then, in `projects/<slug>/`:
1. `css/tokens.css`: the brief's token table, light in `:root`, dark in `[data-theme="dark"]` when the brief has it; derive the remaining colour tokens from the palette. Check WCAG AA for every text/background pair.
2. `css/base.css`, `js/app.js`, `css/components.css`: the app shell and navigation for every role and device in the brief (tab bar, sidebar, top bar). `MK.config` in `js/mock-data.js`: app name and navigation items pointing to screen ids.
3. Components that more than one module needs: functions in `js/components.js`, styles in `css/components.css`, one line each in the COMPONENT INDEX.
4. `js/mock-data.js`: the brief's shared entities (people, places, organisations …) with stable ids, under ~300 lines. Module-only data waits for its module.
5. `README.md`: Constraints and visual direction (one line each for navigation, typography, mood), Open questions from the brief, Decisions taken.
6. `js/project.js`: `status: 'In progress'`, `updated` today.

No screen files: `screens/` keeps only `_screen.html` and `_planned.html`.

## 4. Finish
1. `node scripts/pk.mjs check <slug>` must exit 0.
2. Report in at most 6 lines: what was built, what was uncertain, how to preview (`npm start`), next step `/pk-build <slug> <first module number>`. Do not commit.

Node.js 18+ is required. If it is missing, stop and ask for it to be installed.
