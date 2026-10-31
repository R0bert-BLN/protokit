// Repository health check; must pass before every commit. Returns the number of errors.
import fs from 'node:fs';
import path from 'node:path';
import { abs, rel, read, readOpt, exists, projects, manifest, frontMatter, git, walk, today, STATUSES, SLUG } from './util.mjs';
import { derived, copies, apply, stale, enabledTools } from './sync.mjs';

export function check(only) {
  let errors = 0, warnings = 0;
  const err = (m) => { console.log(`  ✗ ${m}`); errors++; };
  const warn = (m) => { console.log(`  ! ${m}`); warnings++; };
  const all = projects();
  if (only && !all.includes(only)) { console.log(`No project '${only}'. Projects: ${all.join(', ') || '(none)'}`); return 1; }
  const list = only ? [only] : all;
  console.log(`Projects: ${list.join(', ') || '(none)'}`);

  console.log('1. Derived files (site registry, agent adapters)');
  try {
    enabledTools();
    for (const f of apply(derived(), { prune: true })) console.log(`  ↻ ${f}`);
  } catch (e) { err(e.message); }
  for (const f of stale(copies()).filter((f) => !f.startsWith('projects/') || list.some((p) => f.startsWith(`projects/${p}/`)))) {
    err(`${f} differs from .ai/templates/project (change the template, then run: node scripts/pk.mjs sync)`);
  }

  console.log('2. Project structure');
  for (const slug of list) {
    const p = `projects/${slug}`;
    if (!SLUG.test(slug)) err(`${p}: folder name must be lowercase a-z, 0-9, - (it becomes the URL)`);
    for (const f of ['README.md', 'index.html', 'js/project.js']) if (!exists(`${p}/${f}`)) err(`${p}: missing ${f}`);
    let M = null;
    try { M = manifest(slug); } catch (e) { err(e.message); }
    if (!M) continue;
    const screens = (M.modules || []).flatMap((m) => m.screens || []);
    for (const s of screens.filter((s) => s.built)) if (!exists(`${p}/screens/${s.id}.html`)) err(`${p}/js/project.js: '${s.id}' is marked built but screens/${s.id}.html does not exist`);
    for (const f of fs.existsSync(abs(`${p}/screens`)) ? fs.readdirSync(abs(`${p}/screens`)) : []) {
      if (!f.endsWith('.html') || f.startsWith('_')) continue;
      const id = f.slice(0, -5);
      if (!screens.some((s) => s.id === id && s.built)) warn(`${p}/screens/${f}: not marked built: true in js/project.js (missing from the hub and Run app)`);
      if (!read(`${p}/screens/${f}`).includes('js/review.js')) warn(`${p}/screens/${f}: does not load ../js/review.js (review rail, Esc)`);
    }
    const readmeMeta = frontMatter(readOpt(`${p}/README.md`)).meta;
    if (!M.status && readmeMeta.status) warn(`${p}: move 'status' and 'updated' from the README front matter to js/project.js`);
    const status = M.status || readmeMeta.status;
    if (!STATUSES.includes(status)) err(`${p}/js/project.js: status '${status ?? ''}' must be one of ${STATUSES.join(', ')}`);
    const changes = git('status', '--porcelain', '--', p, `briefs/${slug}.md`);
    const updated = M.updated || readmeMeta.updated;
    if (changes?.trim() && updated !== today()) warn(`${p}: uncommitted changes but 'updated' in js/project.js is ${updated || 'missing'}, not ${today()}`);
  }

  console.log('3. Broken local links (href/src)');
  const htmlFiles = walk('.', (f) => f.endsWith('.html'), /^(\.git|node_modules|\.ai|\.claude|\.agents)$/)
    .filter((f) => !only || rel(f).startsWith(`projects/${only}/`) || !rel(f).startsWith('projects/'));
  for (const file of htmlFiles) {
    const dir = path.dirname(file);
    for (const m of read(file).matchAll(/(?:href|src)="([^"]+)"/g)) {
      const ref = m[1].replace(/[?#].*$/, '');
      if (!ref || /^(https?:|\/\/|mailto:|tel:|data:|javascript:)/.test(ref) || /\$\{|\{\{/.test(ref)) continue;
      let target = ref.startsWith('/') ? abs(ref.slice(1)) : path.join(dir, ref);
      if (ref.endsWith('/')) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) err(`${rel(file)} → ${m[1]} (not found)`);
    }
  }

  console.log('4. Hard-coded colours outside tokens.css (hub.css and review.css hold the tool palette)');
  const colour = /#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\(/;
  for (const slug of list) {
    for (const file of walk(`projects/${slug}`, (f) => /\.(css|html|js)$/.test(f))) {
      const name = path.basename(file);
      if (/^(tokens|hub|review)\.css$/.test(name)) continue;
      read(file).split('\n').forEach((line, i) => {
        if (!colour.test(line)) return;
        const where = `${rel(file)}:${i + 1}: ${line.trim().slice(0, 120)}`;
        if (file.endsWith('.css')) {
          const code = line.replace(/\/\*.*?\*\//g, '').replace(/(rgb|hsl)a?\(\s*var\([^)]*\)[^)]*\)/g, '').replace(/var\(--[^)]*\)/g, '');
          if (/:[^;{}]*(#[0-9a-fA-F]{3,8}\b|(rgb|hsl)a?\()/.test(code)) err(where);
        } else if (/(color|background)[a-z-]*:\s*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(line)) warn(`inline colour (move to a token): ${where}`);
      });
    }
  }

  console.log('5. Placeholders');
  for (const slug of list) {
    for (const file of walk(`projects/${slug}`, (f) => /\.(css|html|js)$|README\.md$/.test(f))) {
      read(file).split('\n').forEach((line, i) => {
        if (/[Ll]orem ipsum dolor|\{\{[A-Z_]+\}\}/.test(line)) err(`placeholder left: ${rel(file)}:${i + 1}`);
        else if (/\b(TODO|FIXME)\b/.test(line) && !file.endsWith('.md')) warn(`unfinished: ${rel(file)}:${i + 1}`);
      });
    }
  }

  console.log('6. Component index (js/components.js)');
  for (const slug of list) {
    const f = `projects/${slug}/js/components.js`;
    const src = readOpt(f);
    if (!src) continue;
    const index = [];
    for (const line of src.split('\n')) { if (!line.startsWith('//')) break; index.push(line); if (/END INDEX/.test(line)) break; }
    const text = index.join('\n');
    const long = index.filter((l) => l.startsWith('//  ') && [...l].length > 100).length;
    if (long) warn(`${f}: ${long} COMPONENT INDEX line(s) over 100 characters; move parameter details next to the function`);
    const names = [...new Set([...src.matchAll(/^ {2,4}([a-zA-Z_]\w*)\s*:\s*(?:async\s+)?(?:\([^)]*\)\s*=>|[a-zA-Z_]\w*\s*=>|function)/gm)].map((m) => m[1]))];
    for (const n of names) if (!new RegExp(`\\b${n}\\b`).test(text)) warn(`${f}: ${n}() is not in the COMPONENT INDEX`);
  }

  console.log('7. File size (over 500 KB)');
  for (const slug of list) for (const f of walk(`projects/${slug}`, (x) => fs.statSync(x).size > 500 * 1024)) warn(`large file, compress or resize: ${rel(f)}`);

  console.log('8. Secrets');
  const files = git('ls-files', '--cached', '--others', '--exclude-standard');
  if (files !== null) {
    for (const f of files.split('\n').filter((x) => /(^|\/)(\.dev\.vars|\.env[^/]*)$/.test(x))) err(`secret file would be committed: ${f}`);
    const diff = (git('diff', 'HEAD', '-U0') || '').split('\n').filter((l) => l.startsWith('+'));
    const untracked = (git('ls-files', '--others', '--exclude-standard') || '').split('\n').filter(Boolean)
      .filter((f) => { try { return fs.statSync(abs(f)).size < 1024 * 1024; } catch { return false; } })
      .flatMap((f) => readOpt(f).split('\n'));
    if ([...diff, ...untracked].some((l) => /PASSWORD_[A-Z0-9_]+\s*=\s*\S/i.test(l) && !/PASSWORD_[A-Z0-9_<>]+\s*=\s*(<|`|\$)/.test(l))) err('a password value appears in uncommitted changes');
  }

  console.log(`\nErrors: ${errors}  Warnings: ${warnings}`);
  return errors;
}
