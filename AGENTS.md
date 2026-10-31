# AGENTS.md — instructions for AI assistants

This repository is a protokit workspace: clickable HTML/CSS/JS mockups built from module-based briefs, checked by a CLI, previewed in a local hub, and turned into build plans for coding agents.

- One project per folder: `projects/<name>/`, created from its brief `briefs/<name>.md`.
- The CLI is `node scripts/pk.mjs <command>` (Node.js 18+, no dependencies); `npm start` runs the local hub.

## Before working
Read `.ai/rules/*.md` in numeric order, then `.ai/local/rules/*.md` if the folder exists (this repository's own additions; they win on conflict). Then follow the skill whose description matches the task. Rule 20 says what else to read.

## Skills (`.ai/skills/<name>/SKILL.md`, or `.ai/local/skills/<name>/SKILL.md` when it exists)
The workflow, in order. Tools with commands run them as `/<name> <arguments>`; others: "follow `.ai/skills/<name>/SKILL.md` for <arguments>".

| Skill | Arguments | Does |
|---|---|---|
| `pk-brief` | `<slug> [idea]` | Idea → module-based brief `briefs/<slug>.md` |
| `pk-init` | `<slug> [idea]` | Brief → project folder and foundation (tokens, shell, navigation, shared components and data, README); no screens |
| `pk-build` | `<slug> <n>` | The screens of module `n`, then the design pass; the first screen of a project stops for visual approval |
| `pk-edit` | `<slug> <change>` | Changes to built screens, smallest diff |
| `pk-check` | `[slug]` | `pk check`, console errors and manual checks; fixes what it finds |
| `pk-preview` | `[slug]` | Local hub with live reload and docs |
| `pk-handoff` | `<slug> [n]` | Implementation spec for a production build (foundation, or module `n`) |
| `pk-plan` | `<slug>` | Stack and model questions → build plan → tickets on a Kanzo board for coding agents |
| `pk-agents` | `[tool …]` | Adapters so other AI tools (pi, opencode, Codex, Gemini CLI, Cursor, Copilot) load these rules and skills |
| `pk-commit` | `[hint]` | Check and commit locally; only on request |
| `pk-push` | `[hint]` | Check, commit and push; only on request |

A request to commit, push, deploy or publish, in any language, follows `pk-commit` or `pk-push` exactly.

## Never
- Never add a commit description, a `Co-Authored-By` or other trailer, or name an assistant as author or contributor (rule 00).
- Never commit passwords, `.dev.vars` or `.env*`.
- Never force-push or rewrite history.
- Never edit generated files by hand (`CLAUDE.md`, `.claude/`, `.agents/`, `hub/site.js`, `plans/*/tickets.md`); change the source and run `node scripts/pk.mjs sync` or `pk plan`.
- Never change files in a project the task is not about, or files `.ai/local/rules` protects.
