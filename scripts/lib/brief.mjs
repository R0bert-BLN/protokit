// Briefs (format: briefs/_template.md): parse, check, create the project, module context, handoff spec.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { TEMPLATE, SLUG, fail, rel, abs, read, readOpt, write, today, html, kebab, frontMatter, manifest } from './util.mjs';

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|').replace(/^`|`$/g, ''));
const isRow = (line) => /^\s*\|/.test(line) && !/^\s*\|[\s:|-]+\|\s*$/.test(line);
const yes = (v) => /^(yes|y|true|x)$/i.test(v || '');

export function parseBrief(slug) {
  if (!SLUG.test(slug || '')) fail(`Invalid slug '${slug ?? ''}': lowercase a-z, 0-9 and single hyphens only.`);
  const file = `briefs/${slug}.md`;
  if (!fs.existsSync(abs(file))) fail(`No brief at ${file}. Copy briefs/_template.md to it and fill it in.`);
  const raw = read(file);
  if (!/^---\n/.test(raw)) fail(`${file}: missing front matter (--- … ---) at the top.`);
  const { meta, raw: fm } = frontMatter(raw);
  const bodyStart = fm.split('\n').length;
  // Comments blanked, not removed, to keep line numbers
  const body = raw.slice(fm.length).replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''));

  const sections = [];
  body.split('\n').forEach((line, i) => {
    if (/^## /.test(line)) sections.push({ title: line.slice(3).trim(), start: i, lines: [] });
    else sections[sections.length - 1]?.lines.push(line);
  });
  const section = (re) => sections.find((s) => re.test(s.title));

  const phaseSection = section(/^Phases$/);
  const phases = (phaseSection?.lines || []).filter(isRow).map(cells).filter((c) => c[0].toLowerCase() !== 'key')
    .map(([key, label, name, desc, optional]) => ({ key, label, name, desc, optional: yes(optional) }));

  const modules = sections.map((s) => ({ s, m: s.title.match(/^Module\s+(\d+)\s*[:.–—-]\s*(.+)$/i) })).filter((x) => x.m).map(({ s, m }) => {
    const mod = { n: Number(m[1]), name: m[2].trim(), icon: 'layout-grid', screens: [], section: s };
    let sub = false;
    for (const line of s.lines) {
      if (/^### /.test(line)) sub = true;
      const icon = line.match(/^Icon:\s*`?([a-z0-9-]+)`?\s*$/i);
      if (icon && !sub) mod.icon = icon[1];
      if (sub || !isRow(line)) continue;
      const [id, name, phase, desc, legal] = cells(line);
      if (id.toLowerCase() !== 'id') mod.screens.push({ id, name, phase, desc, legal: yes(legal) });
    }
    return mod;
  });
  const themes = (meta.themes || '').split(',').map((t) => t.trim()).filter(Boolean);
  return { slug, file, meta, body, bodyStart, sections, section, phaseSection, phases, modules, themes };
}

export const sectionText = (s) => `## ${s.title}\n${s.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;

// "### <screen id>" detail inside a module section
export const screenDetail = (mod, id) => {
  const lines = mod.section.lines;
  const at = lines.findIndex((l) => l.trim() === `### ${id}`);
  if (at < 0) return '';
  const end = lines.findIndex((l, i) => i > at && /^###? /.test(l));
  return lines.slice(at + 1, end < 0 ? undefined : end).join('\n').trim();
};
export const moduleSub = (mod, title) => {
  const lines = mod.section.lines;
  const at = lines.findIndex((l) => l.trim().toLowerCase() === `### ${title}`.toLowerCase());
  if (at < 0) return '';
  const end = lines.findIndex((l, i) => i > at && /^###? /.test(l));
  return lines.slice(at + 1, end < 0 ? undefined : end).join('\n').trim();
};

export function checkBrief(b, { forInit = false } = {}) {
  const { meta, phases, modules, themes } = b;
  const errors = [];
  for (const key of ['title', 'description', 'lang', 'device', 'themes']) if (!meta[key]) errors.push(`front matter: '${key}' is required`);
  const isPlaceholder = (v) => /<[^>]*>/.test(v);
  for (const [key, value] of Object.entries(meta)) if (isPlaceholder(value)) errors.push(`front matter: '${key}' still has a placeholder (${value})`);
  if (meta.status !== 'Ready') errors.push(`front matter: status is '${meta.status || ''}'; set it to Ready once the brief is confirmed`);
  if (meta.lang && !isPlaceholder(meta.lang) && !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(meta.lang)) errors.push(`front matter: lang '${meta.lang}' is not a BCP 47 tag (en, ro, en-GB)`);
  if (meta.device && !isPlaceholder(meta.device) && !['phone', 'desktop', 'both'].includes(meta.device)) errors.push('front matter: device must be phone, desktop or both');
  if (meta.themes && !isPlaceholder(meta.themes) && (!themes.includes('light') || themes.some((t) => !['light', 'dark'].includes(t)))) errors.push("front matter: themes must be 'light' or 'light, dark'");

  b.body.split('\n').forEach((line, i) => {
    const hit = line.replace(/`[^`]*`/g, '').match(/<[^>\s][^>]*>/); // inline code ignored
    if (hit) errors.push(`line ${b.bodyStart + i}: placeholder ${hit[0]} (replace it or delete the line)`);
  });

  const phaseKeys = phases.map((p) => p.key);
  if (!b.phaseSection) errors.push("section '## Phases' is missing (keep the heading without a table when the project is not phased)");
  for (const p of phases) {
    if (!/^[a-z0-9]+$/.test(p.key)) errors.push(`Phases: key '${p.key}' must be lowercase letters and digits (p1, p2)`);
    if (!p.label) errors.push(`Phases: '${p.key}' has no label`);
  }
  if (new Set(phaseKeys).size !== phaseKeys.length) errors.push('Phases: duplicate keys');

  if (!modules.length) errors.push("no '## Module <n>: <Name>' sections");
  const nums = modules.map((m) => m.n);
  if (new Set(nums).size !== nums.length) errors.push(`Modules: duplicate numbers (${nums.join(', ')})`);
  for (const m of modules) {
    if (!m.screens.length) errors.push(`Module ${m.n}: no screen rows (the table must come before any ### subsection)`);
    for (const s of m.screens) {
      if (!SLUG.test(s.id)) errors.push(`Module ${m.n}: id '${s.id}' must be kebab-case (a-z, 0-9, -)`);
      if (!s.name) errors.push(`Module ${m.n}: '${s.id}' has no screen name`);
      if (phases.length && !phaseKeys.includes(s.phase)) errors.push(`Module ${m.n}: '${s.id}' has phase '${s.phase || ''}'; expected one of ${phaseKeys.join(', ')}`);
      if (!phases.length && s.phase) errors.push(`Module ${m.n}: '${s.id}' has phase '${s.phase}' but the Phases table is empty`);
    }
  }
  const ids = modules.flatMap((m) => m.screens.map((s) => s.id));
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) errors.push(`duplicate screen ids: ${dup.join(', ')}`);
  if (forInit && fs.existsSync(abs(`projects/${b.slug}`))) errors.push(`projects/${b.slug} already exists`);

  if (errors.length) fail(`${b.file}: ${errors.length} problem(s)\n${errors.map((e) => `  ✗ ${e}`).join('\n')}`);
  return `${modules.length} module(s), ${ids.length} screen(s), ${phases.length ? `${phases.length} phase(s)` : 'not phased'}`;
}

export function initProject(slug) {
  const b = parseBrief(slug);
  const summary = checkBrief(b, { forInit: true });
  const { meta, phases, modules, themes } = b;
  const target = abs(`projects/${slug}`);
  const jsStr = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const js = (s) => `'${jsStr(s)}'`;
  const fill = (file, map) => {
    const p = path.join(target, file);
    fs.writeFileSync(p, Object.entries(map).reduce((t, [k, v]) => t.split(`{{${k}}}`).join(v), read(p)));
  };

  fs.cpSync(TEMPLATE, target, { recursive: true });
  fs.rmSync(path.join(target, 'screens/home.html'), { force: true });
  fill('index.html', { TITLE: html(meta.title) });
  fill('js/mock-data.js', { TITLE: jsStr(meta.title) });
  fill('screens/_screen.html', { LANG: meta.lang });

  // One line per screen: pk check reads it
  const header = read(path.join(TEMPLATE, 'js/project.js')).split('window.MOCKUP')[0];
  const screenLine = (s) => `      { id: ${js(s.id)}, name: ${js(s.name)}${s.phase ? `, phase: ${js(s.phase)}` : ''}${s.legal ? ', legal: true' : ''}, desc: ${js(s.desc || '')} },`;
  write(path.join(target, 'js/project.js'), `${header}window.MOCKUP = {
  title: ${js(meta.title)},
  description: ${js(meta.description)},
  status: 'Brief',
  updated: ${js(today())},
  lang: ${js(meta.lang)},
  device: ${js(meta.device)},
  themes: [${themes.map(js).join(', ')}],
  phases: {${phases.length ? `\n${phases.map((p) => `    ${p.key}: { label: ${js(p.label)}, name: ${js(p.name || p.label)}, desc: ${js(p.desc || '')}${p.optional ? ', optional: true' : ''} },`).join('\n')}\n  ` : ''}},
  modules: [
${modules.map((m) => `    { title: ${js(`${m.n}. ${m.name}`)}, icon: ${js(m.icon)}, screens: [\n${m.screens.map(screenLine).join('\n')}\n    ] },`).join('\n')}
  ],
};
`);

  const known = (v) => v && v !== '—';
  fill('README.md', {
    TITLE: meta.title,
    SLUG: slug,
    SUMMARY: meta.description,
    CONSTRAINTS: [
      `- UI language \`${meta.lang}\`${known(meta.locale) ? `, locale \`${meta.locale}\`` : ''}${known(meta.currency) ? `, currency ${meta.currency}` : ''}.`,
      `- Device: ${{ phone: 'phone, designed at 390 px', desktop: 'desktop, designed at 1440 px', both: 'phone and desktop' }[meta.device]}. Themes: ${themes.join(', ')}.`,
    ].join('\n'),
  });
  return `Created ${rel(target)}/ from ${b.file}: ${summary}.`;
}

const moduleOf = (M, n) => M.modules.find((m) => String(m.title).match(/^(\d+)\./)?.[1] === String(n));
const dataFileOf = (M, n, name) => `js/mock-data-${kebab((moduleOf(M, n) ? String(moduleOf(M, n).title) : name).replace(/^\d+\.\s*/, '').replace(/\s*\(.*$/, ''))}.js`;
const componentIndex = (slug) => readOpt(`projects/${slug}/js/components.js`).match(/^\/\/ COMPONENT INDEX[\s\S]*?^\/\/ END INDEX/m)?.[0] || '';
const needProject = (slug) => {
  if (!fs.existsSync(abs(`projects/${slug}`))) fail(`projects/${slug} does not exist yet: run pk init ${slug} first.`);
  return manifest(slug) || { modules: [] };
};
const needModule = (b, arg, usage) => {
  if (!/^\d+$/.test(arg || '')) fail(usage);
  const mod = b.modules.find((m) => m.n === Number(arg));
  if (!mod) fail(`${b.file}: no "## Module ${arg}: …" section. Modules: ${b.modules.map((m) => m.n).join(', ') || 'none'}.`);
  return mod;
};

export function moduleContext(slug, arg) {
  const b = parseBrief(slug);
  const mod = needModule(b, arg, 'Usage: pk context <slug> <module number>');
  const M = needProject(slug);
  const n = mod.n;
  const all = M.modules.flatMap((m) => m.screens);
  const pm = moduleOf(M, n);
  const label = (k) => M.phases?.[k]?.label || k || '';
  const dataFile = dataFileOf(M, n, mod.name);
  const index = componentIndex(slug);
  const shared = b.sections.filter((s) => !/^Module\s+\d/i.test(s.title) && /user|role|constraint|navigation|interaction/i.test(s.title));
  return [
    `# ${M.title || b.meta.title} · module ${n}: ${mod.name}`,
    `UI language ${b.meta.lang || M.lang} · device ${b.meta.device || '—'} · themes ${(M.themes || []).join(', ')}`,
    `Built so far: ${all.filter((s) => s.built).length} of ${all.length} screens in the project.`,
    `Module data file: ${dataFile} (${fs.existsSync(abs(`projects/${slug}/${dataFile}`)) ? 'exists' : 'create it when the module needs its own data'}; load it right after js/mock-data.js).`,
    '',
    `## Screens (js/project.js${pm ? `, "${pm.title}"` : ': module not found, check the titles'})`,
    ...(pm ? pm.screens : []).map((s) => `- [${s.built ? 'x' : ' '}] ${s.id} — ${s.name}${s.phase ? ` (${label(s.phase)})` : ''}${s.legal ? ' · legal note' : ''} — ${s.desc || ''}`),
    '',
    index ? `## Components (js/components.js)\n${index}\n` : '## Components\nNo index at the top of js/components.js: add one (format: .ai/templates/project/js/components.js).\n',
    '# Brief',
    ...shared.map(sectionText),
    sectionText(mod.section),
  ].join('\n');
}

// Everything the handoff and the build plan derive from a project
export function projectSpec(slug) {
  const b = parseBrief(slug);
  const M = needProject(slug);
  const opt = (p) => readOpt(`projects/${slug}/${p}`);
  const readme = opt('README.md');
  const readmeSection = (title) => readme.match(new RegExp(`^## ${title}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))?.[1].replace(/<!--[\s\S]*?-->/g, '').trim() || '';

  const css = opt('css/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = (re) => Object.fromEntries([...(css.match(re)?.[1] || '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().replace(/\s+/g, ' ')]));
  const light = vars(/:root\s*\{([^}]*)\}/);
  const dark = vars(/\[data-theme="dark"\]\s*\{([^}]*)\}/);

  const ctx = vm.createContext({});
  ctx.window = ctx;
  const root = () => ctx.MK?.data || ctx.DATA || {};
  const loadData = (p) => {
    const before = new Set(Object.keys(root()));
    try { vm.runInContext(opt(p), ctx); } catch (e) { return { p, error: e.message, keys: [] }; }
    return { p, keys: Object.keys(root()).filter((k) => !before.has(k)), note: opt(p).match(/^(\/\/.*\n)+/)?.[0].replace(/^\/\/ ?/gm, '').trim() };
  };
  const jsDir = abs(`projects/${slug}/js`);
  const dataFiles = ['js/mock-data.js', ...(fs.existsSync(jsDir) ? fs.readdirSync(jsDir) : []).filter((f) => /^mock-data-.+\.js$/.test(f)).map((f) => `js/${f}`)].map(loadData);

  const index = componentIndex(slug);
  const indexLines = index.split('\n').filter((l) => /^\/\/\s{2,}/.test(l));
  const screenSource = (id) => opt(`screens/${id}.html`);
  const usedComponents = (ids) => {
    const names = new Set(ids.flatMap((id) => [...screenSource(id).matchAll(/\b(?:UI|ui|SP|MK)\.([a-zA-Z]\w*)/g)].map((m) => m[1])));
    return indexLines
      .filter((l) => { const call = l.split(' — ')[0].replace(/\([^()]*\)/g, '').replace(/\([^()]*\)/g, ''); return [...names].some((nm) => new RegExp(`(^|[.\\s,/])${nm}\\b`).test(call)); })
      .map((l) => l.replace(/^\/\/\s+/, ''));
  };
  const allScreens = M.modules.flatMap((m) => m.screens);
  const links = (id) => [...new Set([...screenSource(id).matchAll(/["'`(]([a-z0-9-]+)\.html\b/g)].map((m) => m[1]))]
    .filter((x) => x !== id && allScreens.some((s) => s.id === x));
  const screensOf = (mod) => moduleOf(M, mod.n)?.screens || mod.screens;
  const decisions = readmeSection('Decisions');
  const decisionsFor = (mod) => decisions.split('\n').filter((l) => new RegExp(`\\bmodules? [\\d–, ]*\\b${mod.n}\\b`, 'i').test(l) || screensOf(mod).some((s) => l.includes(`\`${s.id}\``)));

  return {
    slug, brief: b, M, light, dark, dataFiles, ctxData: root, index, indexLines, usedComponents, links, screensOf, screenSource,
    readmeSection, decisions, decisionsFor, dataFileOf: (mod) => dataFileOf(M, mod.n, mod.name),
    label: (k) => M.phases?.[k]?.label || k || '',
    built: new Set(allScreens.filter((s) => s.built).map((s) => s.id)),
  };
}

const typeOf = (v) => (Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v);
const sample = (v) => { const s = JSON.stringify(v) ?? String(v); return s.length > 40 ? `${s.slice(0, 37)}…` : s; };
export const describeData = (key, v) => {
  if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
    const fields = {};
    for (const row of v) for (const [f, x] of Object.entries(row)) if (!(f in fields) && x != null) fields[f] = x;
    return `- \`${key}\`: list of ${v.length} records; fields ${Object.entries(fields).map(([f, x]) => `${f} (${typeOf(x)}, e.g. ${sample(x)})`).join(', ')}`;
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) return `- \`${key}\`: object with keys ${Object.keys(v).slice(0, 15).join(', ')}${Object.keys(v).length > 15 ? ' …' : ''}`;
  return `- \`${key}\`: ${typeOf(v)}, e.g. ${sample(v)}`;
};
export const dataBlock = (spec, d) => [
  `### ${d.p}`,
  ...(d.error ? [`Could not be evaluated (${d.error}); read the file.`] : []),
  ...(d.note ? [d.note.split('\n').map((l) => `> ${l}`).join('\n'), ''] : []),
  ...d.keys.map((k) => describeData(k, spec.ctxData()[k])),
  '',
];
export const tokenTable = (spec) => {
  const cell = (s) => String(s).replace(/\|/g, '\\|');
  const hasDark = Object.keys(spec.dark).length > 0;
  return [
    `| Token | Light |${hasDark ? ' Dark |' : ''}`,
    `|---|---|${hasDark ? '---|' : ''}`,
    ...Object.keys(spec.light).filter((k) => !k.startsWith('--hub-'))
      .map((k) => `| \`${k}\` | ${cell(spec.light[k])} |${hasDark ? ` ${spec.dark[k] ? cell(spec.dark[k]) : ''} |` : ''}`),
  ];
};

export function handoff(slug, arg) {
  const spec = projectSpec(slug);
  const b = spec.brief;
  const mod = arg === undefined ? null : needModule(b, arg, 'Usage: pk handoff <slug> [module number]');
  const { M } = spec;
  const screenLine = (s) => `- \`${s.id}\` — ${s.name}${s.phase ? ` (${spec.label(s.phase)})` : ''}${s.legal ? ' · legal note' : ''}${spec.built.has(s.id) ? '' : ' · NOT BUILT in the mockup'} — ${s.desc || ''}`;
  const head = [
    `# ${M.title || b.meta.title} · implementation handoff${mod ? ` · module ${mod.n}: ${mod.name}` : ' · foundation'}`,
    `Source: \`projects/${slug}/\` (preview: \`npm start\`). The mockup is a spec for layout, content, flows and states, not code to port: rebuild it with the production stack's own widgets and patterns.`,
    `UI language ${b.meta.lang || M.lang} · locale ${b.meta.locale || '—'} · currency ${b.meta.currency || '—'} · device ${b.meta.device || '—'} · themes ${(M.themes || []).join(', ')}`,
    '',
  ];
  let out;
  if (!mod) {
    const direction = spec.readmeSection('Constraints and visual direction');
    out = [
      ...head,
      `Then hand over one module at a time: \`node scripts/pk.mjs handoff ${slug} <n>\`.`,
      '',
      '# Product',
      ...b.sections.filter((s) => /^(goal|users|constraints|navigation|interactions|phases|out of scope)/i.test(s.title)).map(sectionText),
      direction && `## Constraints and visual direction (current)\n${direction}\n`,
      '# Design tokens (css/tokens.css)',
      'Raw values for the theme. Components use only these; map them to the production theme rather than hard-coding values.',
      '',
      ...tokenTable(spec),
      '',
      '# Components (js/components.js, styles in css/components.css)',
      (spec.index || 'No COMPONENT INDEX: read js/components.js.').replace(/^\/\/ ?/gm, ''),
      '',
      '# Data model (mock data: shapes and examples, not real content)',
      ...spec.dataFiles.flatMap((d) => dataBlock(spec, d)),
      '# Screens',
      ...b.modules.flatMap((m) => [`## Module ${m.n}: ${m.name}`, ...spec.screensOf(m).map(screenLine), '']),
    ];
  } else {
    const df = spec.dataFileOf(mod);
    const ids = spec.screensOf(mod).map((s) => s.id);
    const used = spec.usedComponents(ids);
    const decided = spec.decisionsFor(mod);
    out = [
      ...head,
      `Foundation (tokens, components, shared data model): \`node scripts/pk.mjs handoff ${slug}\`.`,
      '',
      '# Screens',
      ...spec.screensOf(mod).map(screenLine),
      '',
      'Mockup files: `screens/<id>.html`; open them in the preview for navigation, states and interactions (most links are built by components from the data).',
      '',
      '# Components these screens use (full index: foundation handoff)',
      ...(used.length ? used.map((l) => `- ${l}`) : ['None found by name; read the screen files.']),
      '',
      '# Brief',
      sectionText(mod.section),
      '# Decisions for this module (project README)',
      ...(decided.length ? decided : ['None recorded; read the Decisions section of the README for project-wide ones.']),
      '',
      '# Module data',
      ...spec.dataFiles.filter((d) => d.p === df).flatMap((d) => dataBlock(spec, d)),
      ...(spec.dataFiles.some((d) => d.p === df) ? [] : ['No module data file; the screens use the shared data model.', '']),
    ];
  }
  const open = spec.readmeSection('Open questions');
  if (open) out.push('# Open questions (project README)', open, '');
  if (!mod) out.push('# Decisions (project README; they override the brief)', spec.decisions || 'None.', '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

