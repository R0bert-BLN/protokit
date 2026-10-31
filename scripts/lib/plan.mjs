// Build plan: plans/<slug>/stack.md (answers, written by /pk-plan) + the mockup → plans/<slug>/tickets.md → Kanzo.
import fs from 'node:fs';
import { abs, read, readOpt, write, fail, frontMatter, today } from './util.mjs';
import { projectSpec, screenDetail, moduleSub, describeData, dataBlock, tokenTable } from './brief.mjs';

// How big a ticket is, per builder model. See docs/build-plan.md.
export const PROFILES = {
  large: { label: 'large (frontier models, 200k+ context)', componentGroup: 0, splitScreens: false, dataPerFile: false, inlineTokens: false, maxFiles: 0 },
  medium: { label: 'medium (DeepSeek-class, 64k–128k context)', componentGroup: 6, splitScreens: false, dataPerFile: false, inlineTokens: false, maxFiles: 6 },
  small: { label: 'small (local or ≤ 35B models, ≤ 100k context)', componentGroup: 1, splitScreens: true, dataPerFile: true, inlineTokens: true, maxFiles: 3 },
};
const INTERACTIVE = /data-open|\.sheet\(|\.tabs\(|\.chips\(|addEventListener|onclick=|MK\.state|MK\.toast|data-chip|role="tab"/;

function readStack(slug) {
  const file = `plans/${slug}/stack.md`;
  if (!fs.existsSync(abs(file))) fail(`No ${file}. Run /pk-plan ${slug} (it asks the stack questions and writes it), or copy .ai/templates/plan/stack.md.`);
  const text = read(file);
  const { meta, body } = frontMatter(text);
  const profile = PROFILES[meta.profile] ? meta.profile : fail(`${file}: profile must be one of ${Object.keys(PROFILES).join(', ')}`);
  if (/<[^>]+>/.test(Object.values(meta).join(' '))) fail(`${file}: front matter still has placeholders.`);
  const section = (title) => body.match(new RegExp(`^## ${title}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))?.[1].replace(/<!--[\s\S]*?-->/g, '').trim() || '';
  // "### Title" blocks under "## Extra tickets": key: value lines, then the description
  const extras = section('Extra tickets').split(/^### /m).slice(1).map((block) => {
    const [title, ...lines] = block.split('\n');
    const fields = {};
    let i = 0;
    for (; i < lines.length; i++) {
      const m = lines[i].match(/^(after|tags|human|key):\s*(.*)$/i);
      if (!m) break;
      fields[m[1].toLowerCase()] = m[2].trim();
    }
    return { title: title.trim(), after: fields.after || 'end', tags: fields.tags || '', human: /^(yes|true)$/i.test(fields.human || ''), key: fields.key, body: lines.slice(i).join('\n').trim() };
  });
  return { file, meta, profile, P: PROFILES[profile], section, extras, agents: section('Agent instructions'), stackTable: section('Stack'), conventions: section('Conventions') };
}

export function buildPlan(slug) {
  const st = readStack(slug);
  const spec = projectSpec(slug);
  const { M, brief: b } = spec;
  const P = st.P;
  const verify = st.meta.verify || 'the project checks (lint, type check, tests)';
  const mockups = st.meta.mockups ? `${st.meta.mockups.replace(/[\\/]+$/, '')}/projects/${slug}` : `projects/${slug} (mockups repository)`;
  const themes = M.themes || ['light'];
  const tickets = [];
  const add = (t) => { tickets.push({ deps: [], tags: [], human: false, ...t, n: tickets.length + 1 }); return tickets[tickets.length - 1]; };
  const id = (t) => `T${String(t.n).padStart(2, '0')}`;
  const byKey = (k) => tickets.find((t) => t.key === k);
  const extrasAfter = (where) => st.extras.filter((e) => e.after === where).map((e, i) => add({
    key: e.key || `extra:${where}:${i + 1}:${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    title: e.title, tags: ['extra', ...e.tags.split(',').map((x) => x.trim()).filter(Boolean)], human: e.human, body: e.body,
    deps: [byKey('setup')].filter(Boolean),
  }));

  const tokenNames = Object.keys(spec.light).filter((k) => !k.startsWith('--hub-'));

  // Foundation
  const setup = add({
    key: 'setup', title: 'Project setup and agent instructions', tags: ['setup'],
    body: [
      `**Goal:** Create the ${M.title} app skeleton with the chosen stack, so every later ticket only adds code.`,
      '',
      '### Stack',
      st.stackTable || 'See the conventions below.',
      '',
      st.conventions && `### Conventions\n${st.conventions}\n`,
      '### Agent instructions',
      'Create `AGENTS.md` at the repository root with exactly this content (later tickets rely on it):',
      '',
      '```markdown',
      st.agents || '# AGENTS.md\n- Follow the conventions in this file.',
      '```',
      '',
      '### Acceptance criteria',
      '- [ ] The app starts locally and shows an empty start page.',
      `- [ ] \`${verify}\` runs and passes.`,
      '- [ ] `AGENTS.md` exists with the content above.',
    ].filter((x) => x !== '').join('\n'),
  });
  extrasAfter('setup');

  const tokens = add({
    key: 'tokens', title: `Design tokens and theme (${themes.join(', ')})`, tags: ['theme'], deps: [setup],
    body: [
      '**Goal:** Map the mockup design tokens to the stack\'s theme system, so components never hard-code colours, sizes, radii or shadows.',
      '',
      '### Tokens (mockup css/tokens.css)',
      ...tokenTable(spec),
      '',
      `Themes: ${themes.join(', ')}${themes.includes('dark') ? '; the Dark column redefines the colours' : ''}.`,
      spec.readmeSection('Constraints and visual direction') && `\n### Visual direction\n${spec.readmeSection('Constraints and visual direction')}`,
      '',
      '### Acceptance criteria',
      '- [ ] Every token above exists in the theme under an equivalent name.',
      themes.includes('dark') ? '- [ ] The dark theme switches every colour token.' : '',
      `- [ ] \`${verify}\` passes.`,
    ].filter((x) => x !== '').join('\n'),
  });

  const lines = spec.indexLines.map((l) => l.replace(/^\/\/\s+/, ''));
  const groups = [];
  const size = P.componentGroup || lines.length || 1;
  for (let i = 0; i < lines.length; i += size) groups.push(lines.slice(i, i + size));
  const componentTickets = groups.map((g, i) => add({
    key: groups.length === 1 && !P.componentGroup ? 'components' : `components:${g.map((l) => (l.match(/^[\w.]+?\.(\w+)\(/) || l.match(/^(\S+)/))[1]).join('+').slice(0, 60)}`,
    title: g.length === 1 ? `Component: ${g[0].split(' — ')[0].replace(/\s*→.*$/, '').slice(0, 60)}` : `Shared components${groups.length > 1 ? ` (${i + 1}/${groups.length})` : ''}`,
    tags: ['component'], deps: [tokens],
    body: [
      `**Goal:** Build ${g.length === 1 ? 'this shared component' : 'these shared components'} with the stack's own UI primitives. Signature → mockup CSS class — use:`,
      '',
      ...g.map((l) => `- \`${l.split(' — ')[0]}\` — ${l.split(' — ').slice(1).join(' — ')}`),
      '',
      `Reference: \`${mockups}/js/components.js\` and \`css/components.css\`.`,
      P.inlineTokens ? `\nTheme tokens to use: ${tokenNames.map((t) => `\`${t}\``).join(', ')} (${id(tokens)}).` : `\nUse only the theme tokens from ${id(tokens)}.`,
      '',
      '### Acceptance criteria',
      '- [ ] Matches the mockup look in every theme; states (hover, focus-visible, disabled, selected) included.',
      '- [ ] Accessible: semantic elements, labels, visible focus, touch targets ≥ 44 px.',
      `- [ ] \`${verify}\` passes.`,
    ].join('\n'),
  }));

  const dataSets = P.dataPerFile ? spec.dataFiles.map((d) => [d]) : [spec.dataFiles];
  const dataTickets = dataSets.filter((set) => set.some((d) => d.keys.length)).map((set) => add({
    key: `data:${set.map((d) => d.p).join('+')}`,
    title: set.length === 1 ? `Data model: ${set[0].p.replace(/^js\/|\.js$/g, '')}` : 'Data model and sample data',
    tags: ['data'], deps: [setup], dataKeys: set.flatMap((d) => d.keys),
    body: [
      '**Goal:** Define the types and a data layer (API client or local fixtures, per the stack) for these entities. The mock data shows shapes and realistic examples, not real content.',
      '',
      ...set.flatMap((d) => dataBlock(spec, d)),
      `Reference: \`${mockups}/${set.length === 1 ? set[0].p : 'js/mock-data*.js'}\`.`,
      '',
      '### Acceptance criteria',
      '- [ ] Typed models for every entity and field above; ids stay stable across entities.',
      '- [ ] Screens can read the data through one module or service, never inline.',
      `- [ ] \`${verify}\` passes.`,
    ].join('\n'),
  }));

  const nav = b.section(/^Navigation$/);
  const shell = add({
    key: 'shell', title: 'App shell and navigation', tags: ['shell'], deps: [tokens, ...componentTickets],
    body: [
      '**Goal:** Build the app shell (top bar, tab bar or sidebar per role and device) and the routes for every screen of the plan, each showing a placeholder until its ticket is done.',
      '',
      '### Navigation (brief)',
      nav ? nav.lines.join('\n').trim() : 'See the brief.',
      '',
      '### Routes',
      ...b.modules.flatMap((m) => spec.screensOf(m).map((s) => `- \`${s.id}\` — ${s.name}`)),
      '',
      `Reference: \`${mockups}/js/app.js\` (shell) and \`js/mock-data.js\` (\`MK.config\`).`,
      '',
      '### Acceptance criteria',
      '- [ ] Every route exists; the tab bar or sidebar highlights the current section.',
      '- [ ] Back navigation works on every screen.',
      `- [ ] \`${verify}\` passes.`,
    ].join('\n'),
  });
  extrasAfter('foundation');

  // Screens, module by module, in the order a user meets them
  const screenTicket = new Map();
  for (const mod of b.modules) {
    const decided = spec.decisionsFor(mod);
    const interactions = moduleSub(mod, 'Interactions');
    const modTickets = [];
    for (const s of spec.screensOf(mod)) {
      const src = spec.screenSource(s.id);
      const built = spec.built.has(s.id);
      const used = spec.usedComponents([s.id]);
      const usedTickets = componentTickets.filter((t) => used.some((u) => t.body.includes(u.split(' — ')[0])));
      const dataKeys = [...new Set([...src.matchAll(/\b(?:MK\.)?data\.([a-zA-Z_]\w*)/g)].map((m) => m[1]))].filter((k) => spec.ctxData()[k] !== undefined);
      const detail = screenDetail(mod, s.id);
      const head = [
        `**Goal:** Build the **${s.name}** screen (\`${s.id}\`), module ${mod.n} ${mod.name}.`,
        built ? `**Mockup:** \`${mockups}/screens/${s.id}.html\`: a spec for layout, content and states, not code to port.`
          : '**Mockup:** not built; only the brief describes this screen. Follow the design of the other screens of this module.',
        '',
        '### Design notes',
        `- Key content, in order: ${s.desc || 'see the brief'}`,
        s.phase ? `- Phase: ${spec.label(s.phase)}` : '',
        s.legal ? `- Shows the legal note: "${(b.section(/^Constraints$/)?.lines.join('\n').match(/Legal note[^"]*"([^"]+)"/) || [])[1] || 'Requires legal validation before implementation'}"` : '',
        detail && `\n${detail}`,
      ].filter((x) => x !== '');
      const comps = used.length ? ['', '### Components', ...used.map((u) => `- \`${u.split(' — ')[0]}\` — ${u.split(' — ').slice(1).join(' — ')}`)] : [];
      const data = dataKeys.length ? ['', '### Data', ...dataKeys.map((k) => describeData(k, spec.ctxData()[k]))] : [];
      const links = spec.links(s.id);
      const navLines = links.length ? ['', '### Navigation', `- Links to: ${links.map((l) => `\`${l}\``).join(', ')}`] : [];
      const dec = decided.length ? ['', '### Decisions', ...decided] : [];
      const tokensLine = P.inlineTokens ? `- [ ] Uses only theme tokens (${tokenNames.slice(0, 12).map((t) => `\`${t}\``).join(', ')}${tokenNames.length > 12 ? ' …' : ''}); no hard-coded colours or sizes.` : '- [ ] Uses only the shared components and theme tokens; no hard-coded colours or sizes.';
      const usedData = dataTickets.filter((t) => t.dataKeys.some((k) => dataKeys.includes(k)));
      const deps = [shell, ...usedTickets, ...usedData];
      const interactive = INTERACTIVE.test(src) || (!built && interactions);
      if (P.splitScreens && interactive) {
        const a = add({
          key: `screen:${s.id}`, title: `${s.name}: layout and content`, tags: ['screen', `m${mod.n}`, s.phase].filter(Boolean), deps,
          body: [...head, ...comps, ...data, '', '### Acceptance criteria', '- [ ] Every key-content element, in order, with data from the data layer.', tokensLine,
            themes.length > 1 ? `- [ ] Correct in the ${themes.join(' and ')} themes.` : '', '- [ ] Accessible: headings, labels, alt text, AA contrast.', `- [ ] \`${verify}\` passes.`, '', 'Interactions come in the next ticket; leave them inert.'].filter((x) => x !== '').join('\n'),
        });
        const c = add({
          key: `screen:${s.id}:states`, title: `${s.name}: interactions and states`, tags: ['screen', `m${mod.n}`, s.phase].filter(Boolean), deps: [a],
          body: [`**Goal:** Add the interactions and states of the **${s.name}** screen (\`${s.id}\`), built in ${id(a)}.`, '',
            built ? `**Mockup:** \`${mockups}/screens/${s.id}.html\`: try every control in the preview.` : '', '',
            interactions && `### Module interactions\n${interactions}\n`, detail && `### Screen detail\n${detail}\n`, ...navLines, '',
            '### Acceptance criteria', '- [ ] Every control in the mockup works (sheets, tabs, chips, toggles, forms), with in-place feedback.',
            '- [ ] Empty, loading and error states where data is shown.', '- [ ] Keyboard: focus order, Esc closes overlays, visible focus.', links.length ? '- [ ] The links above navigate to their screens.' : '', `- [ ] \`${verify}\` passes.`].filter((x) => x !== '').join('\n'),
        });
        modTickets.push(a, c);
        screenTicket.set(s.id, a);
      } else {
        const t = add({
          key: `screen:${s.id}`, title: `Screen: ${s.name}`, tags: ['screen', `m${mod.n}`, s.phase].filter(Boolean), deps,
          body: [...head, interactions && `\n### Module interactions\n${interactions}`, ...comps, ...data, ...navLines, ...dec, '', '### Acceptance criteria',
            '- [ ] Every key-content element, in order, with data from the data layer.', tokensLine,
            interactive ? '- [ ] Every control in the mockup works; empty, loading and error states where data is shown.' : '',
            links.length ? '- [ ] The links above navigate to their screens.' : '',
            themes.length > 1 ? `- [ ] Correct in the ${themes.join(' and ')} themes.` : '', '- [ ] Accessible: labels, visible focus, touch targets ≥ 44 px, AA contrast.', `- [ ] \`${verify}\` passes.`].filter((x) => x !== '' && x !== undefined).join('\n'),
        });
        modTickets.push(t);
        screenTicket.set(s.id, t);
      }
    }
    add({
      key: `flow:m${mod.n}`, title: `Module ${mod.n} ${mod.name}: flows and tests`, tags: ['flow', `m${mod.n}`], deps: modTickets,
      body: [`**Goal:** Wire and test the user flows through module ${mod.n} ${mod.name} end to end.`, '',
        '### Screens', ...spec.screensOf(mod).map((s) => `- \`${s.id}\` — ${s.name}`), '',
        '### Acceptance criteria', '- [ ] A user can walk every screen of the module in order, and back.', '- [ ] One automated test per main flow (per the stack\'s test setup).', `- [ ] \`${verify}\` passes.`].join('\n'),
    });
    extrasAfter(`module-${mod.n}`);
  }
  extrasAfter('end');
  for (const t of tickets) if (t.key.startsWith('extra:') && !t.deps.length) t.deps = [setup];

  // Links in screen tickets name their target ticket
  for (const t of tickets) t.body = t.body.replace(/- Links to: (.*)$/m, (_, list) => `- Links to: ${list.replace(/`([a-z0-9-]+)`/g, (m, x) => (screenTicket.has(x) ? `${m} (${id(screenTicket.get(x))})` : m))}`);

  // Blank line before headings, bold leads and the rule, which the line filters above drop
  const tidy = (s) => s.replace(/([^\n])\n(#{2,4} |\*\*|---\n)/g, '$1\n\n$2').replace(/\n{3,}/g, '\n\n').trim();
  const footer = (t) => [
    '',
    '',
    '---',
    '### How to work',
    `- Depends on: ${t.deps.length ? [...new Set(t.deps)].map((d) => `${id(d)} ${d.title}`).join('; ') : 'nothing'}. If one of them is not in done, comment which, move this card back to todo and stop.`,
    '- Follow `AGENTS.md`. Read only the files this ticket needs.',
    P.maxFiles ? `- Change at most ${P.maxFiles} files. If the ticket needs more, comment a proposed split and move the card to review.` : '',
    `- Before finishing: \`${verify}\` passes. Commit as \`${id(t)}: <summary>\` (one line).`,
    '- Comment what changed and anything left open, then move the card to review.',
  ].filter(Boolean).join('\n');

  const out = tickets.map((t) => ({
    id: id(t), key: t.key, title: `${id(t)} · ${t.title}`, tags: [...new Set(t.tags)].join(','), human: t.human,
    deps: [...new Set(t.deps)].map(id), description: tidy(t.human ? t.body : `${t.body}${footer(t)}`),
  }));
  return { stack: st, spec, tickets: out };
}

export function writePlan(slug) {
  const { stack, spec, tickets } = buildPlan(slug);
  const lines = [
    `# ${spec.M.title} · build plan`,
    '',
    `Generated by \`node scripts/pk.mjs plan ${slug}\` on ${today()} from \`${stack.file}\` and the mockup; do not edit by hand. Change \`${stack.file}\` (extra tickets go under "Extra tickets") and run it again.`,
    '',
    `| | |\n|---|---|\n| Builder model | ${stack.meta.model || '—'} (${stack.meta.context || '—'} context) |\n| Profile | ${PROFILES[stack.profile].label} |\n| Repository | ${stack.meta.repo || '—'} |\n| Kanzo project | \`${stack.meta.kanzo || slug}\` |\n| Tickets | ${tickets.length}${tickets.some((t) => t.human) ? ` (${tickets.filter((t) => t.human).length} for a person)` : ''} |`,
    '',
    ...tickets.flatMap((t) => [`## ${t.title}`, `\`${t.key}\` · tags ${t.tags || '—'} · depends ${t.deps.join(', ') || '—'}${t.human ? ' · **for a person**' : ''}`, '', t.description, '']),
  ];
  write(`plans/${slug}/tickets.md`, `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`);
  return `Wrote plans/${slug}/tickets.md: ${tickets.length} tickets, profile ${stack.profile}.`;
}

// Minimal MCP client for Kanzo's streamable HTTP endpoint
async function mcp(url) {
  let session = null, seq = 0;
  const post = async (body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(session ? { 'Mcp-Session-Id': session } : {}) },
      body: JSON.stringify(body),
    });
    session = res.headers.get('mcp-session-id') || session;
    if (!('id' in body)) return null;
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${await res.text()}`);
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) return res.json();
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buf += dec.decode(value, { stream: true });
      for (const ev of buf.split(/\n\n/)) {
        const data = ev.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (!data) continue;
        try { const msg = JSON.parse(data); if (msg.id === body.id) { reader.cancel().catch(() => {}); return msg; } } catch {}
      }
      if (done) throw new Error(`${url}: no reply to ${body.method}`);
    }
  };
  const call = async (method, params) => {
    const msg = await post({ jsonrpc: '2.0', id: ++seq, method, params });
    if (msg.error) throw new Error(`${method}: ${msg.error.message}`);
    return msg.result;
  };
  await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'protokit', version: '1' } });
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return async (name, args) => {
    const r = await call('tools/call', { name, arguments: args });
    const text = (r.content || []).map((c) => c.text).join('\n');
    if (r.isError) throw new Error(`${name}: ${text}`);
    return text;
  };
}

export async function pushPlan(slug, { url = 'http://127.0.0.1:4242/mcp', update = false, dry = false } = {}) {
  const { stack, spec, tickets } = buildPlan(slug);
  const project = stack.meta.kanzo || slug;
  const mapFile = `plans/${slug}/kanzo.json`;
  const map = JSON.parse(readOpt(mapFile) || '{}');
  const fresh = tickets.filter((t) => !map[t.key]);
  const lastPushed = Math.max(-1, ...tickets.map((t, i) => (map[t.key] ? i : -1)));
  const late = fresh.filter((t) => tickets.indexOf(t) < lastPushed);
  if (dry) return `${fresh.length} new, ${tickets.length - fresh.length} already on the board${late.length ? `; ${late.map((t) => t.id).join(', ')} would land after tickets they precede` : ''}.`;

  let tool;
  try { tool = await mcp(url); } catch (e) { fail(`Kanzo is not reachable at ${url} (${e.cause?.code || e.message}). Start the board (kanzo, or kanzo service install; on Windows, WSL must be running: see docs/build-plan.md), then retry.`); }
  const projectsText = await tool('list_projects', {});
  if (!projectsText.split('\n').some((l) => l.split(/[\s:]/)[0] === project)) {
    await tool('create_project', { slug: project, name: spec.M.title, ...(stack.meta.repo && /^[\w.-]+\/[\w.-]+$/.test(stack.meta.repo) ? { repo: stack.meta.repo } : {}) });
  }
  // MCP has no "human" field; the board's own API sets it (next_task then skips the ticket)
  const setHuman = async (key, human) => {
    const res = await fetch(new URL(`/api/tasks/${key.split('#').pop()}`, url), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ human }) }).catch((e) => e);
    if (!res.ok) console.warn(`Could not mark ${key} as human (${res.status || res.message}); mark it on the board.`);
  };
  let created = 0, updated = 0;
  for (const t of tickets) {
    const args = { title: t.title, description: t.description, tags: t.tags };
    if (map[t.key]) {
      if (update) { await tool('update_task', { id: map[t.key], ...args }); await setHuman(map[t.key], t.human); updated++; }
      continue;
    }
    const reply = await tool('create_task', { project, ...args });
    const key = reply.match(/Created (\S+#\d+)/)?.[1];
    if (!key) fail(`Unexpected reply from create_task: ${reply}`);
    if (t.human) await setHuman(key, true);
    map[t.key] = key;
    write(mapFile, `${JSON.stringify(map, null, 2)}\n`);
    created++;
  }
  return `Kanzo project '${project}': ${created} created, ${updated} updated, ${tickets.length - created - updated} unchanged.${late.length ? ` Note: ${late.map((t) => t.id).join(', ')} were added at the end of todo, after tickets they should precede; reorder them on the board.` : ''}`;
}
