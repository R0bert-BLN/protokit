---
name: pk-brief
description: Turn a rough mockup idea into a structured, module-based brief in briefs/<slug>.md. Use when a mockup is described informally, or when a brief is missing, incomplete or fails the brief check.
argument-hint: "<slug> [idea]"
---

# Brief

Output: `briefs/<slug>.md` in the format of `briefs/_template.md`. Each module is later built in its own session from its own section, so a precise brief is what lets a small model build it well.

## Steps
1. Read `briefs/_template.md` and the material supplied. If `briefs/<slug>.md` exists, complete it instead of starting over. Without a slug, propose one from the product name (lowercase `a-z 0-9 -`, unused in `projects/` and `briefs/`).
2. Ask at most 3 questions, only about what changes the structure: device, UI language and locale, modules and screens, phases. Decide the rest and list each assumption under "Open questions".
3. Write the brief:
   - Replace every `<placeholder>`, delete lines that do not apply, remove the guidance comments.
   - Global sections hold only what every module shares: users and roles, constraints, palette, navigation, shared data, shared interactions, phases.
   - One `## Module <n>: <Name>` section per module, in the order a user meets them: `Icon:`, the screen table (columns unchanged), then optional `### Data`, `### Interactions` and `### <screen id>` detail. Everything a module needs is in its own section.
   - Screen ids: kebab-case, unique, module prefix (`booking-slots`). "Key content" lists the elements in order of appearance: "Week strip, 30-minute slot grid, selected-slot summary, Continue button".
   - Palette: a hex value per token in the Light column; the Dark column only with `themes: light, dark`. Text/background pairs meet WCAG AA.
   - Keep `status: Draft`.
4. `node scripts/pk.mjs brief <slug>`: fix every problem except the status.
5. Summarize in at most 5 lines (modules, screens, phases, device, language) with the open questions. On confirmation, set `status: Ready`.

## Quality bar
- Concrete nouns over adjectives: "RSVP: Going / Can't / Maybe, with live counts", not "a nice RSVP".
- Every screen appears once, in one module. Legal, payment and privacy screens have `Legal: yes`.
- Once the project exists, the brief is not edited: scope changes go to the project README under Decisions.
