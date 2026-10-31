# Conventions

How a mockup is organised. The full rules for assistants are in `.ai/rules/`; this is the version for people.

## What a mockup is

A throwaway prototype for validating flows and visual direction: plain HTML, CSS and vanilla JavaScript, no framework, no build step. It works when `index.html` is opened from disk, on the local server and on any static host. Interactions are in memory only: navigation, tabs, sheets, toasts, toggles that update counts, wizards. No backend, no persistence, no real auth.

## Project files

```
projects/<slug>/
├── README.md             summary, constraints and visual direction, decisions, open questions
├── index.html            the project hub (rendered from js/project.js)
├── css/tokens.css        design tokens: the only file with raw values
├── css/base.css          reset, typography, layout, device frame
├── css/components.css    component styles
├── js/project.js         status, updated, modules, screens, phases, themes; built: true marks a built screen
├── js/mock-data.js       shared data, stable ids
├── js/mock-data-<m>.js   data used by one module only
├── js/components.js      MK.ui.* functions returning HTML; COMPONENT INDEX at the top
├── js/app.js             shell, navigation, overlays, toasts, in-memory state
├── screens/<id>.html     one file per screen, named by its id
└── assets/               images (SVG, or WebP/JPEG up to 200 KB)
```

The hub and review files (`js/hub.js`, `css/hub.css`, `js/review.js`, `css/review.css`, `screens/_planned.html`) are the same in every project. They come from `.ai/templates/project/` and `pk sync` copies them; never edit them inside a project.

## Status

`js/project.js` holds the project status and the date of the last change:

```js
window.MOCKUP = {
  title: 'Clinic booking',
  status: 'In progress',   // Brief | In progress | Review | Approved | Archived
  updated: '2026-11-02',
  …
};
```

The hubs read them; `pk check` warns when the project changed but `updated` is not today.

## Design tokens

Every colour, spacing, radius, shadow, font size and z-index is a custom property in `tokens.css`. `:root` holds the light theme; `[data-theme="dark"]` redefines the colours when the brief has a dark theme. A theme change is an edit to `tokens.css` only, and every screen meets WCAG AA contrast in every theme.

The hubs and review tools have their own light/dark palette and never use the project's tokens, so a project's design never changes the tools around it.

## Components and data

- Markup used more than twice becomes a function in `components.js`, with its styles in `components.css` and one line in the COMPONENT INDEX. Assistants read the index instead of the whole file.
- No `<style>` blocks in screens; inline styles only for one-off layout tweaks.
- Data are JavaScript objects (no JSON files, so the mockup works from disk), realistic and in the brief's language and locale. Screens read the data files and never hard-code content shown elsewhere.

## Screens

- Scripts load in this order: `project.js`, `mock-data.js`, module data, `components.js`, `app.js`, `review.js`.
- Links go to other screens by id (`booking-slots.html`) even before those are built; the review tools show "Not implemented yet".
- Designed at 390 px wide unless the brief targets desktop; on desktop a phone mockup sits in a device frame.
- Accessibility: WCAG AA contrast, visible focus, touch targets of at least 44 px, semantic elements, `alt` on images, `lang` on the page.
- A phased project shows the phase badge on every screen; legal, payment and privacy screens show the brief's legal note.

## The project README

Short and factual, one line per item:

- **Decisions**: every non-trivial choice made without asking, dated, with the reason. A decision that replaces an earlier one replaces its line.
- **Open questions**: what blocks or could change the design. When answered, the answer moves to Decisions.

History is git (`git log -- projects/<slug>`), not a changelog.

## Commits

One logical change per commit, one line: `<scope>: <imperative summary>`, at most 72 characters. The scope is the project name, `hub`, `ai`, `docs` or `infra`. No description and no attribution lines.
