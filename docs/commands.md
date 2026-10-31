# Commands

## Skills

Skills are the procedures an AI assistant follows. In tools with commands they run as `/<name> <arguments>`; in any tool, "follow `.ai/skills/<name>/SKILL.md` for <arguments>" works. `pk-commit`, `pk-push` and `pk-preview` run only when you ask.

| Skill | Arguments | Does | Commits |
|---|---|---|---|
| `pk-brief` | `<slug> [idea]` | Writes or completes `briefs/<slug>.md`; at most three questions | No |
| `pk-init` | `<slug> [idea]` | Validates the brief, creates the project, builds the foundation; no screens | No |
| `pk-build` | `<slug> <n>` | Builds the screens of module `n`, then a design pass | No |
| `pk-edit` | `<slug> <change>` | Changes built screens with the smallest diff | No |
| `pk-check` | `[slug]` | `pk check`, console errors and manual checks; fixes what it finds | No |
| `pk-preview` | `[slug]` | Starts the local hub | No |
| `pk-handoff` | `<slug> [n]` | Prints the implementation spec for a production build | No |
| `pk-plan` | `<slug>` | Asks the stack and model questions, generates tickets, puts them on a Kanzo board | No |
| `pk-agents` | `[tool …]` | Sets up other AI tools to use the rules and skills | No |
| `pk-commit` | `[hint]` | Checks and commits locally, one commit per scope | **Yes** |
| `pk-push` | `[hint]` | Checks, commits and pushes | **Yes** |

Plain requests work too: `Continue clinic-booking.`, `clinic-booking: reminders go through WhatsApp instead of SMS.`, `Summarize clinic-booking: built and planned screens per module, open questions.`

## CLI

`node scripts/pk.mjs <command>`, or `npm run pk -- <command>`. Node.js 18+, no dependencies.

| Command | Does |
|---|---|
| `brief <slug>` | Validates `briefs/<slug>.md`: placeholders, required fields, phase keys, screen ids, with line numbers |
| `init <slug>` | Creates `projects/<slug>/` from a Ready brief: template, `js/project.js` with every screen, README; adds it to the hub |
| `context <slug> <n>` | Prints what an assistant needs to build module `n`: screens and status, data file, component index, shared brief sections, the module section |
| `handoff <slug> [n]` | Prints the implementation spec: product, tokens, components, data model, screens, decisions; or one module |
| `plan <slug>` | Generates `plans/<slug>/tickets.md` from `plans/<slug>/stack.md` and the mockup |
| `plan push <slug>` | Creates the tickets on the Kanzo board. `--dry-run` shows what would happen, `--update` rewrites tickets already on the board, `--url` sets the MCP endpoint (default `http://127.0.0.1:4242/mcp`) |
| `check [slug]` | Repository checks; exit code 1 on errors. Must pass before every commit |
| `serve [slug]` | Local hub with live reload and docs. `--port <n>`, `--no-open`, `--no-live` (for browser automation). `npm start` runs it |
| `sync` | Regenerates the derived files: agent adapters, `hub/site.js`, the shared hub and review files of every project |
| `agents [list\|add\|remove] [tool …]` | Lists or changes the AI tools that get adapters |
| `kit update [--from <path or URL>]` | Updates the kit files from upstream protokit |
| `version` | Prints the protokit version |

## What `pk check` checks

| # | Check | Fails when |
|---|---|---|
| 1 | Derived files | Regenerates `hub/site.js` and the agent adapters. Fails when a project's shared hub or review file differs from the template (a hand edit in the wrong place; `pk sync` overwrites it) |
| 2 | Structure | A project lacks `README.md`, `index.html` or `js/project.js`, has an invalid name or status, or marks a screen built without its file. Warns when a screen file is not marked built, or the project changed but `updated` is not today |
| 3 | Links | A local `href` or `src` points to a file that does not exist |
| 4 | Colours | A colour value appears in a CSS declaration outside `tokens.css` (inline colours warn) |
| 5 | Placeholders | Lorem ipsum or a `{{PLACEHOLDER}}` is left (`TODO` and `FIXME` warn) |
| 6 | Component index | Warns when a function is missing from the COMPONENT INDEX, or an index line is over 100 characters |
| 7 | File size | Warns about files over 500 KB |
| 8 | Secrets | `.dev.vars` or `.env*` would be committed, or a password value appears in uncommitted changes |
