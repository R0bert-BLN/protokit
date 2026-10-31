# AI tools

Every assistant reads the same source: `AGENTS.md` (the entry point), the rules in `.ai/rules/` and the skills in `.ai/skills/`. A tool that looks for them somewhere else gets an **adapter**: a generated copy or pointer in the place it looks. Adapters are written by `pk sync`, kept current by `pk check`, and never edited by hand.

## Set up a tool

```text
/pk-agents opencode pi
```

or without an assistant:

```bash
npm run pk -- agents list
npm run pk -- agents add opencode pi
npm run pk -- agents remove cursor
```

The list is kept in `protokit.json` under `agents`.

| Tool | Key | Gets | Run a skill |
|---|---|---|---|
| Claude Code | `claude` | `CLAUDE.md` (imports the rules), `.claude/skills/` | `/pk-build clinic-booking 2` |
| Codex CLI | `codex` | `.agents/skills/` | by name, or `/skills` |
| opencode | `opencode` | `.agents/skills/`, `.opencode/commands/` | `/pk-build clinic-booking 2` |
| pi | `pi` | `.agents/skills/`, `.pi/prompts/` | `/pk-build clinic-booking 2` |
| Gemini CLI | `gemini` | `.agents/skills/`, `.gemini/settings.json` (reads `AGENTS.md`) | by name, or `/skills` |
| Cursor | `cursor` | `.agents/skills/`, `.cursor/commands/` | `/pk-build clinic-booking 2` |
| GitHub Copilot (VS Code) | `copilot` | `.agents/skills/`, `.github/prompts/` | `/pk-build clinic-booking 2` |
| Anything else that reads `AGENTS.md` and `.agents/skills/` | `generic` | `.agents/skills/` | by name |

`.agents/skills/` is the shared folder of the Agent Skills standard; Codex, opencode, pi, Gemini CLI, Cursor and Copilot all read it. The command files only point to the skill, so the procedure lives in one place.

In any tool, this always works:

```text
Follow .ai/skills/pk-build/SKILL.md for clinic-booking 2.
```

Start the tool in the repository root, so it finds `AGENTS.md`.

## A tool that is not listed

`/pk-agents <tool>` looks up the tool's documentation: where it reads instructions, skills and commands, and how it passes arguments. A tool that reads `AGENTS.md` and `.agents/skills/` only needs `generic`; otherwise the assistant adds an adapter to `scripts/lib/sync.mjs` and a row to this page. That is a change to the kit: make it in protokit too (a pull request is welcome), or it is lost on the next `pk kit update`.

## Models

Small models do well here because the work is cut into small, fully specified pieces: one module per session, a context command that prints exactly what is needed, and checks that catch mistakes. For the build itself, `/pk-plan` sizes the tickets for the model you name; see [Build plan](build-plan.md).
