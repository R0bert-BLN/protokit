# Workflow

From an idea to an approved mockup, and from the mockup to a build plan.

```
 Idea
   │
   ▼
 /pk-brief <slug> ─────► briefs/<slug>.md: shared sections + one section per module
   │                                       ■ checkpoint: brief confirmed (status: Ready)
   ▼
 /pk-init <slug> ──────► project folder + foundation: tokens, shell, navigation,
   │                     shared components and data, README; no screens
   ▼
 /pk-build <slug> 1 ───► first screen only
   │                                       ■ checkpoint: visual approval
   ▼
 /pk-build <slug> <n> ─► the other screens, one module per session, then a design pass
   │                                       ■ checkpoint after each module
   ▼
 /pk-check ── /pk-commit
   │
   ▼
 /pk-plan <slug> ──────► stack + model questions → tickets → Kanzo board → coding agents
   │
   ▼
 pk factory <slug> ────► the agent works the board unattended, one verified commit per ticket
```

## Principles

- **The brief is split by module.** Each module section holds everything that module needs, so a module is built from a few kilobytes of context instead of the whole brief.
- **The CLI does the deterministic work.** Validating, scaffolding, assembling context, checking and generating the spec are scripts, identical for every model.
- **One place per fact.** Screen status and project status are in `js/project.js`; components are listed in the index at the top of `js/components.js`; decisions and open questions are in the project README; history is git. The hub reads these; nothing is copied.
- **Checkpoints before scale.** The brief is confirmed before scaffolding, the look is approved on one screen, and work goes one module at a time.
- **Nothing is committed implicitly.** Only `/pk-commit` and `/pk-push` commit, and only when asked.

## 1. Brief

`/pk-brief <slug> <idea>` asks at most three structural questions, writes the brief, validates it and summarises it in five lines. A precise brief is the cheapest way to good screens:

- Concrete nouns over adjectives: "RSVP: Going / Can't / Maybe, with live counts", not "a nice RSVP".
- "Key content" lists the elements of a screen in order of appearance.
- Every screen appears once, in one module; legal, payment and privacy screens have `Legal: yes`.

A module section:

```markdown
## Module 2: Booking
Icon: calendar

| ID | Screen | Phase | Key content | Legal |
|---|---|---|---|---|
| booking-doctors | Choose a doctor | p1 | Doctor cards: photo, specialty, next free slot; specialty chips | |
| booking-slots | Free slots | p1 | Week strip, 30-minute slot grid, selected-slot summary, Continue button | |

### Data
- 6 doctors, 4 specialties, two weeks of slots with 30 % booked.

### booking-slots
- Past slots are hidden; a booked slot is shown struck through.
```

`npm run pk -- brief <slug>` lists what is missing, with line numbers. Once the project exists the brief is not edited: scope changes go to the project README under Decisions.

## 2. Foundation

`/pk-init <slug>` runs `pk init` (template, `js/project.js` with every screen planned, README) and builds the foundation: tokens with WCAG AA contrast, the app shell and navigation, shared components and shared data. No screens yet. The project hub now lists every screen as planned: the cheapest moment to add or remove screens.

## 3. Screens

`/pk-build <slug> <n>` reads the project README and `pk context <slug> <n>`, nothing else, builds each screen of module `n` that is not built yet and marks it `built: true`. It never touches other modules. When no screen of the project exists yet, it builds only the first one and stops for your visual approval: adjustments go into tokens and components so they apply everywhere.

After a module, a design pass refines the new screens (contrast, touch targets, focus, states, every theme), with the `impeccable` skill when it is installed. Then the check, and a stop. To run several modules in a row:

```text
Build modules 3–5 without stopping, then run /pk-check clinic-booking.
```

To resume another day: `Continue clinic-booking.` takes the first module with screens not built.

## 4. Changes

`/pk-edit <slug> <change>`, or simply `clinic-booking: <change>`, makes the smallest change: tokens and components for global changes, data files for data. Scope changes are recorded under Decisions with a date and the reason.

## 5. Check and commit

`/pk-check <slug>` runs `pk check` (structure, links, colours outside tokens, placeholders, status, component index, file sizes, secrets) plus console errors and manual checks in a browser when one is available, and fixes what it finds.

`/pk-commit` checks and commits, one commit per scope, with one-line messages (`clinic-booking: add booking module`) and no description or attribution lines. `/pk-push` does the same and pushes. See [Customizing](customizing.md) for publishing.

## 6. Hand-over

Two ways to build the production app from the mockup:

- **One assistant, module by module**: `/pk-handoff <slug>` prints the implementation spec (tokens, components, data model, screens, decisions); `/pk-handoff <slug> <n>` one module. It also gives a block for the production repository's `AGENTS.md`.
- **A team of agents on a board**: `/pk-plan <slug>`, described in [Build plan](build-plan.md).

## Choosing a model for the mockup

| Stage | Model | Why |
|---|---|---|
| Brief, foundation | Large | Every later step depends on them |
| First screen | Large or medium | It sets the visual standard the others copy |
| Modules, changes | Small or medium | They follow the module section, the component index and the existing screens |
| Check, commit | Small | Mostly scripted |

Tokens stay low when every screen has concrete key content, each session covers one module, and change requests name the project and the screen id.
