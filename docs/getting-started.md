# Getting started

## Requirements

- **Node.js 18 or later.** The CLI and the local server use it; nothing is installed in the repository (`package.json` has scripts only, no dependencies).
- **Git.**
- **A browser.** Mockups open from disk too, but the hub's docs and live reload need the local server.
- Optional: an **AI assistant** that works in a terminal or editor: Claude Code, Codex, opencode, pi, Gemini CLI, Cursor or GitHub Copilot. See [AI tools](agents.md).

## Set up

```bash
git clone <your fork of protokit> my-mockups
cd my-mockups
npm start
```

`npm start` (the same as `node scripts/pk.mjs serve`) starts the local hub at `http://localhost:3000` and opens it. The port goes up when 3000 is busy; `npm start -- --port 4000 --no-open` sets it. Ctrl+C stops it.

Name your workspace in `protokit.json`:

```json
{
  "title": "Acme mockups",
  "description": "Prototypes for the Acme apps.",
  "agents": ["claude"],
  "upstream": "https://github.com/<owner>/protokit.git"
}
```

`agents` lists the AI tools to set up ([AI tools](agents.md)); `upstream` is where `pk kit update` takes new protokit versions from ([Customizing](customizing.md)).

## The hub

The sidebar lists every project with its status and how many screens are built, the guide, and the brief template. Open a project for its overview:

- **Phases**: each card filters the screen list and Run app to one delivery phase.
- **Modules**: every screen in the order a user meets it. A built screen opens the mockup; a planned one opens a page with what it will contain.
- **Run app** walks the built screens as one flow; previous / next sit on the review rail at the right edge. **Esc** on any screen comes back to the hub.
- **README, Brief, Build stack, Build plan**: the project's documents, rendered in place (local server only).

On a screen, the review rail on the right edge switches the mockup between its themes (and, in Run app, goes to the previous or next screen). Drag it up or down (or focus it and press Alt + arrow keys) so it never covers what you are reviewing. The hub's own light or dark theme is the switch at the bottom left of the sidebar.

## Your first project

With an assistant, started in the repository root:

```text
/pk-brief clinic-booking "online booking for a dental clinic: patients pick a doctor and a slot, get reminders, can reschedule"
```

It asks up to three questions (device, language, modules), writes `briefs/clinic-booking.md` and waits for your confirmation. Then:

```text
/pk-init clinic-booking          # project folder, tokens, navigation, shared components and data
/pk-build clinic-booking 1       # the first screen only: approve the look, then the rest of module 1
/pk-build clinic-booking 2       # one module per session
```

Without an assistant, the same steps by hand:

```bash
cp briefs/_template.md briefs/clinic-booking.md   # fill it in, set status: Ready
npm run pk -- brief clinic-booking                # lists what is still missing
npm run pk -- init clinic-booking                 # creates projects/clinic-booking/
npm run pk -- check clinic-booking                # before every commit
```

Next: [Workflow](workflow.md).
