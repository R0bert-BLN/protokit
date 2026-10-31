// Local server: static files, live reload, and the docs API (/__pk/*) used by the hub for Markdown views.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { ROOT, abs, read, readOpt, update, projects, fail } from './util.mjs';
import { render } from './markdown.mjs';
import { derived } from './sync.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.mp4': 'video/mp4',
};
// The human docs; rules and skills are for assistants and stay out of the UI
const DOC_ORDER = ['getting-started', 'workflow', 'commands', 'conventions', 'build-plan', 'agents', 'customizing'];
const isDoc = (p) => /^(README\.md|docs\/[^/]+\.md|briefs\/[^/]+\.md|projects\/[^/]+\/README\.md|plans\/[^/]+\/[^/]+\.md)$/.test(p);
const titleOf = (p) => render(readOpt(p)).title || path.basename(p, '.md');

function info() {
  const docs = [];
  if (fs.existsSync(abs('README.md'))) docs.push({ path: 'README.md', title: 'Overview', group: 'Guide' });
  const files = fs.existsSync(abs('docs')) ? fs.readdirSync(abs('docs')).filter((f) => f.endsWith('.md')) : [];
  const rank = (f) => { const i = DOC_ORDER.indexOf(f.slice(0, -3)); return i < 0 ? 99 : i; };
  for (const f of files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))) docs.push({ path: `docs/${f}`, title: titleOf(`docs/${f}`), group: 'Guide' });
  if (fs.existsSync(abs('briefs/_template.md'))) docs.push({ path: 'briefs/_template.md', title: 'Brief template', group: 'Guide' });
  const project = {};
  for (const slug of projects()) {
    const list = [];
    const add = (key, p, title) => { if (fs.existsSync(abs(p))) list.push({ key, path: p, title }); };
    add('readme', `projects/${slug}/README.md`, 'README');
    add('brief', `briefs/${slug}.md`, 'Brief');
    add('stack', `plans/${slug}/stack.md`, 'Build stack');
    add('plan', `plans/${slug}/tickets.md`, 'Build plan');
    project[slug] = list;
  }
  return { docs, projects: project };
}

function doc(p) {
  if (!isDoc(p) || !fs.existsSync(abs(p))) return null;
  const dir = path.posix.dirname(p);
  const link = (href, image) => {
    if (/^(https?:|mailto:|#)/.test(href)) return href;
    const [file, hash = ''] = href.split('#');
    const target = path.posix.normalize(path.posix.join(dir, file)).replace(/^\.\//, '');
    if (!image && isDoc(target)) return `#/doc/${target}${hash ? `::${hash}` : ''}`;
    return `/${target}${hash ? `#${hash}` : ''}`;
  };
  const out = render(read(p), { link });
  return { path: p, ...out, mtime: fs.statSync(abs(p)).mtime.toISOString() };
}

const LIVE = `(() => {
  const es = new EventSource('/__pk/events');
  es.onmessage = (e) => {
    const { path } = JSON.parse(e.data);
    if (path.endsWith('.css')) {
      document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
        if (/^https?:/.test(l.getAttribute('href')) && !l.href.startsWith(location.origin)) return;
        const u = new URL(l.href); u.searchParams.set('v', Date.now()); l.href = u.href;
      });
    } else if (path.endsWith('.md')) {
      dispatchEvent(new CustomEvent('pk:md', { detail: path }));
    } else location.reload();
  };
})();`;

export function serve(slug, { port = 3000, open = true, live = true } = {}) {
  if (slug && !fs.existsSync(abs(`projects/${slug}/index.html`))) fail(`No project '${slug}'. Projects: ${projects().join(', ') || '(none)'}`);
  const clients = new Set();
  const refreshSite = () => { try { update('hub/site.js', derived()['hub/site.js']); } catch {} };
  refreshSite();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let p;
    try { p = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end('Bad request'); return; }
    const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };

    if (p === '/__pk/info') return json(info());
    if (p === '/__pk/doc') { const d = doc(url.searchParams.get('path') || ''); return d ? json(d) : json({ error: 'Not a doc' }, 404); }
    if (p === '/__pk/live.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); res.end(LIVE); return; }
    if (p === '/__pk/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    let file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT) || /[\\/]\.git([\\/]|$)/.test(file)) { res.writeHead(403).end('Forbidden'); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: `${p}/${url.search}` }).end(); return; }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': TYPES['.txt'] }).end(`Not found: ${p}`); return; }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    if (live && type.startsWith('text/html')) {
      const page = fs.readFileSync(file, 'utf8');
      const tag = '<script src="/__pk/live.js"></script>';
      res.end(page.includes('</body>') ? page.replace(/<\/body>(?![\s\S]*<\/body>)/, `${tag}</body>`) : page + tag);
    } else fs.createReadStream(file).pipe(res);
  });

  let timer = null;
  const pending = new Set();
  const watcher = fs.watch(ROOT, { recursive: true }, (_, name) => {
    if (!name) return;
    const f = name.replace(/\\/g, '/');
    if (/^(\.git|node_modules)\/|(^|\/)\.DS_Store$|~$/.test(f)) return;
    pending.add(f);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if ([...pending].some((x) => /^projects\/[^/]+\/js\/project\.js$|^protokit\.json$/.test(x))) refreshSite();
      for (const x of pending) for (const c of clients) c.write(`data: ${JSON.stringify({ path: x })}\n\n`);
      pending.clear();
    }, 120);
  });

  const start = slug ? `/projects/${slug}/` : '/';
  const listen = (n) => {
    server.once('error', (e) => { if (e.code === 'EADDRINUSE' && n < port + 20) listen(n + 1); else { console.error(e.message); process.exit(1); } });
    server.listen(n, '127.0.0.1', () => {
      const href = `http://localhost:${n}${start}`;
      console.log(`protokit is running at ${href}\n${live ? 'Live reload is on. ' : ''}Press Ctrl+C to stop.`);
      if (open) {
        const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', href]] : [process.platform === 'darwin' ? 'open' : 'xdg-open', [href]];
        spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
      }
    });
  };
  listen(port);
  process.on('SIGINT', () => { watcher.close(); process.exit(0); });
}

