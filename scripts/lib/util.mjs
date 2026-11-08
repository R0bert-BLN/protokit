import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TEMPLATE = path.join(ROOT, '.ai/templates/project');
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const STATUSES = ['Brief', 'In progress', 'Review', 'Approved', 'Archived'];

export class Fail extends Error {}
export const fail = (msg) => { throw new Fail(msg); };
export const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
export const abs = (p) => path.join(ROOT, p);
export const exists = (p) => fs.existsSync(abs(p));
export const read = (p) => fs.readFileSync(path.isAbsolute(p) ? p : abs(p), 'utf8').replace(/\r\n?/g, '\n');
export const readOpt = (p) => (fs.existsSync(path.isAbsolute(p) ? p : abs(p)) ? read(p) : '');
export const write = (p, text) => {
  const file = path.isAbsolute(p) ? p : abs(p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
// Writes only when the content changes; returns true when it did
export const update = (p, text) => {
  if (readOpt(p) === text) return false;
  write(p, text);
  return true;
};

export const today = () => {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((x) => String(x).padStart(2, '0')).join('-');
};
export const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kebab = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const config = () => {
  try { return JSON.parse(readOpt('protokit.json') || '{}'); } catch (e) { fail(`protokit.json: ${e.message}`); }
};
export const saveConfig = (cfg) => write('protokit.json', `${JSON.stringify(cfg, null, 2)}\n`);

export const projects = () => (fs.existsSync(abs('projects')) ? fs.readdirSync(abs('projects'), { withFileTypes: true }) : [])
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
  .map((d) => d.name)
  .sort();

// js/project.js evaluated in a sandbox: window.MOCKUP
export const manifest = (slug) => {
  const src = readOpt(`projects/${slug}/js/project.js`);
  if (!src) return null;
  const sandbox = { window: {} };
  try { vm.runInNewContext(src, sandbox); } catch (e) { fail(`projects/${slug}/js/project.js: ${e.message}`); }
  return sandbox.window.MOCKUP || null;
};

// Front matter as a flat object; `# comments` after a value are dropped
export const frontMatter = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (!m) return { meta, body: text, raw: '' };
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*?)\s*(?:\s#\s.*)?$/);
    if (kv) meta[kv[1]] = /^#(\s|$)/.test(kv[2]) ? '' : kv[2];
  }
  return { meta, body: text.slice(m[0].length), raw: m[0] };
};

export const git = (...args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};

export const walk = (dir, filter = () => true, skip = /^(\.git|node_modules)$/) => {
  const out = [];
  const start = path.isAbsolute(dir) ? dir : abs(dir);
  if (!fs.existsSync(start)) return out;
  for (const e of fs.readdirSync(start, { withFileTypes: true })) {
    if (skip.test(e.name)) continue;
    const p = path.join(start, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter, skip));
    else if (filter(p)) out.push(p);
  }
  return out;
};
