# protokit

Clickable mockups, from brief to build plan. protokit is a workspace for designing apps as plain HTML/CSS/JS prototypes with AI coding assistants, then handing them to agents that build the real thing.

- **Briefs split into modules**, so each part of the app is built in a small, focused session, even by a small model.
- **A CLI that does the deterministic work**: validation, scaffolding, context for each module, checks, the implementation spec.
- **A local dev hub** with every project, screen and doc, light and dark, live reload and a Run app mode that walks the screens as one flow.
- **Build plans for coding agents**: answer the stack questions, name the model that will build it, and get tickets sized for that model, with the design notes inline, on a [Kanzo](https://github.com/emanuele-em/kanzo) board, worked by your agents or unattended by `pk factory`.
- **Works with your assistant**: Claude Code, Codex, opencode, pi, Gemini CLI, Cursor and GitHub Copilot read the same rules and skills.

No framework, no build step, no dependencies: Node.js 18+ and a browser.

## Quick start

```bash
git clone <your fork of protokit> my-mockups
cd my-mockups
npm start
```

`npm start` opens the hub at `http://localhost:3000`. Then, with an assistant started in the repository root:

```text
/pk-brief clinic-booking "online booking for a dental clinic: patients pick a doctor and a slot"
/pk-init clinic-booking
/pk-build clinic-booking 1
```

Without an assistant: copy `briefs/_template.md` to `briefs/<slug>.md`, fill it in, check it with `npm run pk -- brief <slug>` and create the project with `npm run pk -- init <slug>`.

## Documentation

| | |
|---|---|
| [Getting started](docs/getting-started.md) | Requirements, setup, your first project |
| [Workflow](docs/workflow.md) | From idea to approved mockup, step by step |
| [Commands](docs/commands.md) | Every skill and CLI command |
| [Conventions](docs/conventions.md) | How a project is organised: tokens, components, data, screens |
| [Build plan](docs/build-plan.md) | Stack questions, model profiles, tickets on a Kanzo board |
| [AI tools](docs/agents.md) | Using protokit with Claude Code, Codex, opencode, pi, Gemini CLI, Cursor, Copilot |
| [Customizing](docs/customizing.md) | Your own rules and skills, kit updates, hosting |

The docs are also in the hub sidebar when it runs locally.

## Repository

```
├── projects/<slug>/     one self-contained mockup per folder
├── briefs/<slug>.md     the module-based brief of each project; _template.md is the format
├── plans/<slug>/        build plans: stack.md (answers), tickets.md (generated)
├── docs/                this guide
├── hub/                 the site hub (hub.js, hub.css) and its generated registry (site.js)
├── index.html           the site hub: every project
├── .ai/                 rules, skills and templates for AI assistants; .ai/local/ for your own
├── AGENTS.md            the entry point for assistants
└── scripts/pk.mjs       the CLI
```

## License

[MIT](LICENSE)
