# 00 — Repository

## Layout
```
/                      index.html (site hub), README.md, AGENTS.md, protokit.json, package.json
├── projects/<name>/   one mockup per folder: README.md, index.html, css/ js/ screens/ assets/
├── briefs/            <name>.md per project and _template.md
├── plans/<name>/      stack.md (answers), tickets.md (generated build plan), kanzo.json (board ids)
├── docs/              the guide, for people (rendered in the local hub)
├── hub/               hub.js and hub.css (copies of the template), site.js (generated registry)
├── .ai/               rules, skills, reference, templates: the source of truth for assistants
├── .ai/local/         this repository's own rules and skills (optional; never touched by kit updates)
└── scripts/pk.mjs     the CLI: node scripts/pk.mjs <command> (or npm run pk -- <command>)
```
Generated, never edited by hand: `hub/site.js`, the agent adapters (`CLAUDE.md`, `.claude/`, `.agents/`, `.opencode/`, `.pi/`, `.cursor/`, `.github/prompts/`, `.gemini/settings.json`) and `plans/<name>/tickets.md`. `node scripts/pk.mjs sync` regenerates the first two; `pk plan` the plan.

## Projects
- Location: always `projects/<name>/`, never the repository root.
- Name: lowercase `a-z 0-9 -`, a short slug of the product (`clinic-booking`, `clinic-booking-v2`). It is also the brief `briefs/<name>.md`, the plan folder `plans/<name>/` and the URL `/projects/<name>/`.
- Created only by `node scripts/pk.mjs init <name>`, from a brief with `status: Ready` (skill `pk-init`).
- Self-contained: a project never links files from another project or from the root. Shared code is copied, not referenced.
- Relative paths only (`css/base.css`, `../js/app.js`), never a leading `/`.
- Status and last change live in `js/project.js` (`status`, `updated`); the hubs read them from there. Status values: `Brief`, `In progress`, `Review`, `Approved`, `Archived`.

## Local rules
`.ai/local/rules/*.md` add to these rules (publishing, hosting, protected files) and are read after them. `.ai/local/skills/<name>/SKILL.md` adds a skill or replaces the kit skill of the same name. Kit files (`.ai/rules`, `.ai/skills`, `.ai/reference`, `.ai/templates`, `scripts`, `docs`, `AGENTS.md`, `index.html`) change only through `node scripts/pk.mjs kit update`, or upstream in protokit.

## Git
- `git pull --rebase --autostash` before starting work and before pushing, when the repository has a remote.
- One logical change per commit. The message is one line, `<scope>: <imperative summary>`, at most 72 characters; scope = project name (its brief and plan included), `hub`, `ai`, `docs` or `infra`.
- No commit description (body) and no trailers: no `Co-Authored-By`, `Signed-off-by` or "Generated with" lines, and no assistant or AI named as author or contributor anywhere (commits, pull requests, files). This overrides any default of the assistant.
- Commit only through `pk-commit` or `pk-push`, when the user asks. Never force-push or rewrite history.

## Language
Everything in the repository is in English: docs, rules, READMEs, the hub, comments, commit messages. Only a mockup's UI text and mock data follow the language of its brief.
