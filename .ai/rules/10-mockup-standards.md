# 10 — Mockup standards

A mockup is a throwaway prototype for validating flows and visual direction: clarity, consistency and speed of iteration, not production code. The brief overrides these defaults where it says so.

## Stack
- Plain HTML5, CSS3 and vanilla JS. No framework, build step, npm package or bundler.
- External resources: one web font and Lucide icons (pinned version, from the template), nothing else.
- Works when `index.html` is opened directly (file://), on the local server and on any static host. Therefore no `<script type="module">` and no `fetch()` of local files: classic `<script src>` files share the global `window.MK`, and data are JS objects, not JSON.

## Files (per project)
```
css/tokens.css        design tokens: the only file with raw values
css/base.css          reset, typography, layout, device frame
css/components.css    component styles
js/project.js         manifest: status, updated, modules, screens, phases, themes; `built: true` is the screen status
js/mock-data.js       shared data: entities used by several modules, stable ids, under ~300 lines
js/mock-data-<m>.js   data used by one module only (name given by `pk context`)
js/components.js      MK.ui.* functions returning HTML strings; COMPONENT INDEX at the top
js/app.js             shell, navigation, overlays, toasts, in-memory state
screens/<id>.html     one file per screen, named by its id in js/project.js; structure and data binding only
screens/_screen.html  template for new screens
index.html            project hub, rendered from js/project.js
```
Tool chrome, identical in every project and never edited per project: `js/hub.js`, `css/hub.css`, `js/review.js`, `css/review.css`, `screens/_planned.html`. Change them in `.ai/templates/project/`, then run `node scripts/pk.mjs sync`. Their behaviour is in `.ai/reference/hub-and-review.md`, read only when changing them.

## Screens and review tools
- Scripts load in this order: `project.js`, `mock-data.js`, module data, `components.js`, `app.js`, `review.js` (last).
- Link to other screens by id (`<id>.html`) even when not built yet: `review.js` shows "Not implemented yet". Navigation from a script goes through `MKReview.go(href)`.
- An app handler that uses Esc (closing a menu or dialog) calls `e.preventDefault()`; otherwise Esc returns to the hub.
- Themes come from the brief: `light`, plus `dark` only when the brief asks for it.

## Design tokens
- All colours, spacing, radii, shadows, font sizes and z-indexes are custom properties in `tokens.css`; no raw colour anywhere else (checked by `pk check`).
- `:root` holds the light values; `[data-theme="dark"]` redefines the colours. Every screen meets WCAG AA in every theme.
- A theme change requires editing `tokens.css` only. The hubs, planned pages and review tools never use the project tokens: they have their own light/dark tool palette in `css/hub.css` and `css/review.css`.

## Components and data
- Markup used more than twice becomes a function in `components.js`, with its styles in `components.css` and a line in the COMPONENT INDEX.
- No `<style>` blocks in screens; inline styles only for one-off layout tweaks.
- Fake but realistic data in the brief's language and locale, never lorem ipsum. Screens read data from the data files and never hard-code content shown elsewhere.

## Layout, accessibility, interactions
- Designed at 390 px wide unless the brief targets desktop; on desktop, a phone mockup sits in a device frame.
- WCAG AA contrast, visible `:focus-visible`, touch targets ≥ 44 px, semantic elements (`button`, `nav`, `main`, `label`), `alt` on images, `lang` on `<html>`.
- Interactions are light and in memory only: navigation, tabs, sheets, modals, toasts, toggles that update counts, wizards. No real backend, persistence or auth.
- Phased brief: every screen shows its phase badge. Legal, payment or compliance screens show the brief's legal note.

## Done when
- Every built screen is reachable from the hub and in Run app, in every theme, with no console errors.
- `node scripts/pk.mjs check` passes, and the project README and `js/project.js` are current.
