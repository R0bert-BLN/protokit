# Build plan

`/pk-plan <slug>` turns an approved mockup into a plan that coding agents can build on their own: tickets in build order, each sized for the model that will do it, each with its design notes inline, on a [Kanzo](https://github.com/emanuele-em/kanzo) board.

## How it works

1. **Questions.** The assistant asks, in short rounds, about the production app: platform and framework, language, UI library, state and data fetching, backend, database, auth, testing, CI and hosting, the production repository, and **the model the agents will run**. The answers go into `plans/<slug>/stack.md`, so a second run asks only what changed.
2. **Tickets.** `npm run pk -- plan <slug>` combines `stack.md` with the mockup (screens, components, tokens, data model, navigation, decisions) into `plans/<slug>/tickets.md`. This file is generated: to change the plan, change `stack.md` and run it again.
3. **Board.** After you review the plan, `npm run pk -- plan push <slug>` creates the Kanzo project, linked to the production repository, and the tickets in order.
4. **Agents.** In the production repository, connect your agents to Kanzo and ask: "take the next task from kanzo and do it".

## Model profiles

A ticket must fit what the model can hold and get right. `stack.md` records the model and its profile:

| Profile | Typical models | Tickets |
|---|---|---|
| `large` | Frontier models with 200k+ context | One per screen; all components in one ticket |
| `medium` | Strong hosted or open models with 64k–128k context (DeepSeek class) | One per screen; components in groups of six |
| `small` | Self-hosted or ≤ 35B models, MoE models with few active parameters, ≤ 100k context | One per component and per data file; each interactive screen split into "layout and content" and "interactions and states"; at most three files per ticket; token names inline |

When size and context disagree, the smaller profile wins. A 35B mixture-of-experts model with 3B active parameters and 100k context is `small`. As a measure: a 48-screen mockup gives about 70 tickets for `large`, 80 for `medium` and 175 for `small`.

## What a ticket contains

```
T42 · Screen: Free slots
tags screen, m2, p1 · depends T06, T11, T18, T21

Goal: build the Free slots screen (booking-slots), module 2 Booking.
Mockup: <mockups>/projects/clinic-booking/screens/booking-slots.html

Design notes      key content in order, phase, legal note, the brief's screen detail, module interactions
Components        the components this screen uses, with their signatures
Data              the entities it shows, with their fields and examples
Navigation        the screens it links to, with their tickets
Decisions         recorded decisions that concern it
Acceptance        checklist, ending with the verify command
How to work       dependencies, file limit, verify, commit format, move to review
```

The order is: setup (which also writes the production repository's `AGENTS.md`), theme tokens, components, data model, app shell, then each module's screens and a flow-test ticket per module. Work the mockup cannot show (backend, auth, payments, CI, deploy) goes under **Extra tickets** in `stack.md`, with `after:` saying where it belongs. Steps only a person can do (accounts, API keys, store listings) have `human: yes`: agents skip them, and the tickets that need them wait.

## Kanzo

Kanzo is a kanban board and an MCP server in one small program. Agents take the top card of "todo" with `next_task`, which is why the plan is created in build order.

**Install** (macOS, Linux):

```bash
curl -LsSf https://github.com/emanuele-em/kanzo/releases/latest/download/kanzo-installer.sh | sh
kanzo service install      # keeps the board running at http://localhost:4242
```

**On Windows**, run Kanzo in WSL (`wsl --install` once, then the two commands above inside the Linux shell; WSL needs systemd, which is on by default in current Ubuntu images). The board is then reachable from Windows at `http://localhost:4242`, and so is its MCP endpoint, `http://localhost:4242/mcp`.

WSL stops the Linux system, and the board with it, a few seconds after the last WSL window or process closes. Keep one open while agents work, for example a terminal running `wsl -d Ubuntu --exec sleep infinity`. To have it always on, add that command to the Windows startup (Task Scheduler, "At log on", hidden window).

`pk plan push` marks `human: yes` tickets through the board's own API (Kanzo's MCP tools cannot set that flag), so it needs the board on the same machine.

**Push the plan:**

```bash
npm run pk -- plan push clinic-booking --dry-run
npm run pk -- plan push clinic-booking
```

Ticket ids on the board are saved in `plans/<slug>/kanzo.json`. Running the push again creates only new tickets; `--update` rewrites the existing ones after you change `stack.md`. New tickets land at the end of "todo": if one belongs earlier, move it on the board.

**Connect the agents** in the production repository:

```bash
claude mcp add kanzo --scope user -- kanzo mcp     # Claude Code (on Windows with WSL: use the URL below)
codex mcp add kanzo -- kanzo mcp                   # Codex
```

Any other MCP client: `http://localhost:4242/mcp`. Then: "take the next task from kanzo and do it". Each agent moves its card to "doing", comments as it works, and finishes in "review" for you to check.
