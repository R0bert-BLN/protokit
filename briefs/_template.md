---
title: <Product name>
description: <One line: what the product does, for whom, and what the mockup validates.>
status: Draft          # Draft | Ready. A project is created only from a Ready brief.
lang: <en>             # UI language (BCP 47): en, ro, de, en-GB …
locale: <en-GB>        # formats for dates, numbers and sample data
currency: <GBP>        # or — when not relevant
device: <phone>        # phone (390 px) | desktop (1440 px) | both
themes: <light>        # light | light, dark
owner: —
---

# <Product name>

<!-- Brief template. Copy to briefs/<slug>.md (file name = project slug: lowercase a-z, 0-9, -).
     Replace every <placeholder> or delete the line, remove these comments, set status: Ready.
     `node scripts/pk.mjs brief <slug>` lists what is still missing.
     Global sections first, then one "## Module <n>: <Name>" section per module. Each module is built in one
     session from its own section plus Users and roles, Constraints, Navigation and Interactions, so keep
     everything a module needs inside its section. Keep the table columns: scripts/pk.mjs reads them.
     Concrete nouns beat adjectives: "RSVP: Going / Can't / Maybe, with live counts", not "a nice RSVP". -->

## Goal
<What the mockup must validate (flows, visual direction, scope) and for whom.> It is a throwaway prototype before the production build on <platform>.

## Users and roles
- <Role>: <what this role does; which modules it uses>.

## Constraints
- Stack: repository default (plain HTML, CSS and vanilla JavaScript; no build step).
- Font: <family and weights>. Icons: Lucide.
- Legal note on legal, payment or privacy screens: "<Requires legal validation before implementation>" (in the UI language).

## Visual direction
- Mood: <two or three words>.

<!-- Light values are required. Fill the Dark column only when themes includes dark. -->
| Token | Light | Dark |
|---|---|---|
| `--bg` | <#hex> | |
| `--surface` | <#hex> | |
| `--border` | <#hex> | |
| `--text` | <#hex> | |
| `--text-muted` | <#hex> | |
| `--primary` | <#hex> | |
| `--primary-soft` | <#hex> | |
| `--accent` | <#hex> | |
| `--warning` | <#hex> | |
| `--danger` | <#hex> | |

## Navigation
<!-- Per role and device: tab bar items, sidebar groups or top bar, each pointing to a screen id. -->
- <Phone: tab bar Home (home) · Search (search) · Profile (profile)>

## Shared data
<!-- Entities used by more than one module; they go in js/mock-data.js. Module-only data goes in its module section. -->
- <People: 12 players with name, position, city, rating>

## Interactions
<!-- Interactions shared by every module. State is in memory only. -->
- <Bottom sheets, toasts, tabs …>

## Phases
<!-- One row per delivery phase, in order. Delete the table (keep the heading) when the project is not phased.
     Key: short id used in the module tables. Optional: yes renders a dashed badge. -->
| Key | Label | Name | Scope | Optional |
|---|---|---|---|---|
| p1 | P1 MVP | <Launch> | <What the first release contains> | |

## Module 1: <Name>
<!-- Icon: a Lucide icon name. Screens in app-flow order:
       ID: file name in screens/ without .html; kebab-case, unique across the project (a module prefix helps).
       Phase: a key from the Phases table; empty when the project is not phased.
       Key content: the elements of the screen in order of appearance; shown on the project hub.
       Legal: yes when the screen shows the legal note.
     The table comes first. Optional subsections after it: "### Data", "### Interactions", "### <screen id>" for detail. -->
Icon: <layout-grid>

| ID | Screen | Phase | Key content | Legal |
|---|---|---|---|---|
| <home> | <Home> | p1 | <Greeting, today's summary, three quick actions> | |

### Data
- <Data used only by this module.>

### Interactions
- <Interactions specific to this module.>

## Out of scope
- <What the mockup deliberately leaves out.>

## Open questions
- <Anything undecided that could change the structure. Delete the section when there is none.>
