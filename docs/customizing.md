# Customizing

## Your own rules and skills

The kit (rules, skills, templates, scripts, these docs) is shared by everyone who uses protokit. Your additions go in `.ai/local/`, which kit updates never touch:

```
.ai/local/
├── rules/50-publishing.md     read after the kit rules; wins on conflict
└── skills/pk-push/SKILL.md    replaces the kit skill of the same name, or adds a new one
```

Typical local rules: how and where the mockups are published, which files are protected, client-specific conventions. After adding or changing a local skill, run `npm run pk -- sync` so every AI tool gets it.

## Kit updates

```bash
npm run pk -- kit update                       # from "upstream" in protokit.json
npm run pk -- kit update --from ../protokit    # or a path, or a git URL
```

It replaces the kit files (`.ai/rules`, `.ai/skills`, `.ai/reference`, `.ai/templates`, `scripts`, `docs`, `briefs/_template.md`, `index.html`, `AGENTS.md`, `package.json`), removes kit files that no longer exist upstream, and runs `pk sync`, which also refreshes the hub and review files of every project. Your projects, briefs, plans, `README.md`, `protokit.json` and `.ai/local/` stay as they are. Review the result with `git diff` and commit it as `ai: update protokit`.

Change the kit itself only upstream, in protokit; a local edit to a kit file is overwritten by the next update.

## Hosting

The repository is a static site: `index.html` (every project), `hub/` and `projects/`. Any static host serves it: GitHub Pages, Netlify, an S3 bucket, your own server. Only those three paths need to be published; keep `briefs/`, `plans/`, `docs/`, `scripts/` and `.ai/` out of the upload.

Mockups often show unreleased products, so put a password in front of them when the host allows it. Without the local server, the hub shows projects and screens but no documents.

Record your setup in a local rule (`.ai/local/rules/50-publishing.md`): what a push does, the URL, how access works, which files must never change. `/pk-push` follows it.
