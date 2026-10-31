// The kit: files protokit owns. `pk kit update` copies them from the upstream protokit repository;
// everything else (README, protokit.json, projects, briefs, plans, .ai/local) belongs to this repository.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, abs, config, fail, walk } from './util.mjs';

export const KIT = [
  '.ai/rules', '.ai/skills', '.ai/reference', '.ai/templates', 'scripts', 'docs',
  'briefs/_template.md', 'index.html', 'AGENTS.md', 'package.json', '.gitattributes',
];

export async function kitUpdate(from) {
  const source = from || config().upstream;
  if (!source) fail('No upstream: pass --from <path or git URL>, or set "upstream" in protokit.json.');
  let dir = path.resolve(ROOT, source);
  let tmp = null;
  if (/^(https?:|git@|ssh:)/.test(source) || source.endsWith('.git')) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'protokit-'));
    execFileSync('git', ['clone', '--depth', '1', '--quiet', source, tmp], { stdio: 'inherit' });
    dir = tmp;
  }
  if (!fs.existsSync(path.join(dir, 'scripts/lib/kit.mjs'))) fail(`${source} is not a protokit repository (no scripts/lib/kit.mjs).`);
  if (path.resolve(dir) === ROOT) fail('The upstream is this repository.');

  // The upstream decides what the kit contains
  const { KIT: kit } = await import(pathToFileURL(path.join(dir, 'scripts/lib/kit.mjs')).href);
  const changed = [];
  for (const entry of kit) {
    const src = path.join(dir, entry);
    const dst = abs(entry);
    if (!fs.existsSync(src)) continue;
    if (fs.statSync(src).isDirectory()) {
      const theirs = new Set(walk(src).map((f) => path.relative(src, f)));
      for (const f of walk(dst)) if (!theirs.has(path.relative(dst, f))) { fs.rmSync(f); changed.push(`${entry}/${path.relative(dst, f).replace(/\\/g, '/')} (removed)`); }
      for (const f of theirs) if (copy(path.join(src, f), path.join(dst, f))) changed.push(`${entry}/${f.replace(/\\/g, '/')}`);
    } else if (copy(src, dst)) changed.push(entry);
  }
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  // Regenerate with the new scripts
  execFileSync(process.execPath, [abs('scripts/pk.mjs'), 'sync'], { stdio: 'inherit', cwd: ROOT });
  return changed.length ? `Updated from ${source}:\n${changed.map((c) => `  ${c}`).join('\n')}` : `Already up to date with ${source}.`;
}

function copy(src, dst) {
  const data = fs.readFileSync(src);
  if (fs.existsSync(dst) && fs.readFileSync(dst).equals(data)) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, data);
  return true;
}
