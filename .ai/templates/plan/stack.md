---
project: {{SLUG}}
repo: <owner/repo of the production repository>
kanzo: {{SLUG}}
mockups: <absolute path of this repository, so builder agents can open the mockup screens>
model: <builder model, e.g. DeepSeek V3.2 or a self-hosted 35B>
context: <context window, e.g. 100k>
profile: <small | medium | large>
verify: <one command that lints, type-checks and tests, e.g. pnpm lint && pnpm test>
path: <absolute path of the production repository checkout, for pk factory>
agent: <command that runs the builder agent non-interactively, e.g. pi -p --model llama-cpp/ornith>
reset:  # optional: command run after a failed factory attempt (reinstall dependencies, reset the dev database)
protected:  # optional: comma-separated files or folders/ the agent may not change, besides AGENTS.md and the verify script
llm:  # optional: URL the factory polls before each attempt, e.g. http://127.0.0.1:8080/v1/models
attempts: 5
timeout: 30  # minutes per attempt
---

# {{TITLE}} · build stack

<!-- Written by /pk-plan from the answers. `node scripts/pk.mjs plan {{SLUG}}` turns this file and the mockup into tickets.md.
     Profile: large = one ticket per screen; medium = per screen, components in groups of 6; small = one ticket per component
     and data file, screens split into layout and interactions, at most 3 files per ticket. -->

## Stack
| Area | Choice | Notes |
|---|---|---|
| Platform | <web, iOS, Android, desktop> | |
| Framework | <e.g. Next.js 15, Flutter 3.27> | |
| Language | <e.g. TypeScript 5> | |
| UI and styling | <e.g. Tailwind 4 + shadcn/ui> | |
| State and data fetching | <e.g. TanStack Query> | |
| Backend and API | <e.g. Supabase, REST API in repo X, none yet> | |
| Database | <e.g. Postgres via Supabase> | |
| Auth | <e.g. Supabase Auth, email + Google> | |
| Testing | <e.g. Vitest + Playwright> | |
| CI and hosting | <e.g. GitHub Actions, Vercel> | |
| Package manager | <e.g. pnpm> | |

## Conventions
- <Folder structure, naming, i18n, where components, screens and data live.>

## Agent instructions
<!-- Becomes AGENTS.md in the production repository (the setup ticket creates it). Keep it short and concrete. -->
# AGENTS.md
- Stack: <one line>.
- Tickets come from the Kanzo board: take the next with `next_task`, comment progress with `add_comment`, finish by moving the card to `review`.
- Each ticket holds its design notes inline; the mockup paths in it are a visual reference, not code to port.
- Before finishing a ticket: `<verify command>` passes. Commit as `T<nn>: <summary>` (one line, no description).
- Never change files outside the ticket's scope; if blocked, comment why and move the card to `review`.

## Extra tickets
<!-- Work the mockup cannot show: backend, auth, payments, CI, deploy, accounts and secrets. One "### Title" each, then:
       after: setup | foundation | module-<n> | end    (where it goes in the order)
       tags: comma-separated
       human: yes                                      (only for steps a person must do: accounts, keys, store listings)
     then the description in Markdown, with acceptance criteria. -->
