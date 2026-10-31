// Identical in every project and in hub/: change it in .ai/templates/project, then run node scripts/pk.mjs sync.
// Renders the site hub (MKHub.site), a project hub (MKHub.hub) and planned screens (MKHub.planned).
// On the local server (npm start) it also shows the docs: Markdown rendered by /__pk/doc.
window.MKHub = (() => {
  const storage = (area) => ({
    get(k) { try { return window[area].getItem(k); } catch { return null; } },
    set(k, v) { try { window[area].setItem(k, v); } catch {} },
  });
  const ls = storage('localStorage'), ss = storage('sessionStorage');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const pct = (n, of) => (of ? Math.round(n / of * 100) : 0);
  const meter = (n, of, label) => `<span class="pk-meter${n && n === of ? ' is-done' : ''}" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${pct(n, of)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct(n, of)}%"></span></span>`;
  const status = (s) => `<span class="pk-status" data-status="${esc(s)}">${esc(s)}</span>`;
  const DEVICE = { phone: ['smartphone', 'Phone'], desktop: ['monitor', 'Desktop'], both: ['monitor-smartphone', 'Phone and desktop'] };

  // Tool theme: system, light or dark; shared by every hub and the review tools on this origin
  const UI_KEY = 'pk.ui';
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const uiPref = () => (['light', 'dark'].includes(ls.get(UI_KEY)) ? ls.get(UI_KEY) : 'system');
  const applyUi = () => { document.documentElement.dataset.ui = uiPref() === 'system' ? (dark.matches ? 'dark' : 'light') : uiPref(); };
  applyUi();
  dark.addEventListener?.('change', applyUi);
  const themeSwitch = () => `<div class="pk-seg" role="group" aria-label="Interface theme">${[['system', 'monitor', 'System'], ['light', 'sun', 'Light'], ['dark', 'moon', 'Dark']]
    .map(([v, i, l]) => `<button type="button" data-pk-ui="${v}" aria-pressed="${uiPref() === v}" title="${l} theme" aria-label="${l} theme">${icon(i)}</button>`).join('')}</div>`;

  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.protocol.startsWith('http');
  const api = (p) => fetch(p, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const info = isLocal ? api('/__pk/info') : Promise.resolve(null);

  let root, state = {};
  const paint = (html) => {
    root.innerHTML = html;
    window.lucide?.createIcons?.({ attrs: { 'stroke-width': 1.75 } });
  };

  function shell({ brand, side, crumbs, tools = '', content, doc = false }) {
    return `<div class="pk-app${state.open ? ' is-open' : ''}">
      <aside class="pk-side" id="pk-side" aria-label="Sidebar">
        ${brand}
        <div class="pk-side-scroll">${side}</div>
        <div class="pk-side-foot">${themeSwitch()}</div>
      </aside>
      ${state.open ? '<button type="button" class="pk-scrim" data-pk-menu aria-label="Close the sidebar"></button>' : ''}
      <div class="pk-main">
        <header class="pk-bar">
          <button type="button" class="pk-btn pk-icon-btn pk-menu" data-pk-menu aria-controls="pk-side" aria-expanded="${!!state.open}" aria-label="Menu">${icon('menu')}</button>
          <nav class="pk-crumbs" aria-label="Breadcrumb">${crumbs}</nav>
          <div class="pk-bar-tools">${tools}</div>
        </header>
        <main class="pk-content${doc ? ' is-doc' : ''}" id="main">${content}</main>
      </div>
    </div>`;
  }
  const link = (href, label, { ico, meta = '', current = false, lead = '' } = {}) =>
    `<a class="pk-link" href="${esc(href)}"${current ? ' aria-current="page"' : ''}>${lead}${ico ? icon(ico) : ''}<span class="pk-link-text">${esc(label)}</span>${meta ? `<span class="pk-link-meta">${esc(meta)}</span>` : ''}</a>`;
  const navGroup = (title, items, meta = '') => (items.length ? `<nav class="pk-nav" aria-label="${esc(title)}"><div class="pk-nav-h">${esc(title)}${meta ? `<span>${esc(meta)}</span>` : ''}</div>${items.join('')}</nav>` : '');
  // Collapsible group; open state remembered per browser (pk.nav.<key>), always open around the current page
  const navFold = (key, title, items, { meta = '', open = false } = {}) => {
    if (!items.length) return '';
    const saved = ls.get(`pk.nav.${key}`);
    const isOpen = items.some((h) => h.includes('aria-current')) || (saved === null ? open : saved === '1');
    return `<details class="pk-nav pk-fold" data-pk-fold="${esc(key)}"${isOpen ? ' open' : ''}>
      <summary class="pk-nav-h">${icon('chevron-right')}<b>${esc(title)}</b>${meta ? `<span>${esc(meta)}</span>` : ''}</summary>
      <div class="pk-fold-body">${items.join('')}</div></details>`;
  };
  // Page name first, then where it lives
  const crumbs = (name, where = '', href = '') => `<span class="pk-crumb-page">${esc(name)}</span>${where ? `<i>·</i>${href ? `<a href="${esc(href)}">${esc(where)}</a>` : `<span class="pk-crumb-where">${esc(where)}</span>`}` : ''}`;

  // Docs ------------------------------------------------------------------
  const docRoute = () => {
    const m = location.hash.match(/^#\/doc\/([^:]+)(?:::(.+))?$/);
    return m ? { path: decodeURIComponent(m[1]), anchor: m[2] } : null;
  };
  async function docView(path) {
    const d = await api(`/__pk/doc?path=${encodeURIComponent(path)}`);
    if (!d) return { title: path, html: `<div class="pk-empty"><h2>Not available</h2><p><code>${esc(path)}</code> is not a document, or the local server is not running (<code>npm start</code>).</p></div>` };
    const props = Object.entries(d.meta || {});
    const toc = d.toc.length > 2 ? `<nav class="pk-toc" aria-label="On this page"><b>On this page</b>${d.toc.map((t) => `<a href="#${esc(t.id)}" class="is-l${t.level}" data-pk-anchor>${esc(t.text)}</a>`).join('')}</nav>` : '<span></span>';
    return {
      title: d.title || path,
      html: `<div class="pk-doc"><article>
        <div class="pk-doc-file">${icon('file-text')}<span>${esc(d.path)}</span></div>
        ${props.length ? `<dl class="pk-props">${props.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
        <div class="md">${d.html}</div>
      </article>${toc}</div>`,
    };
  }
  const scrollTo = (id) => requestAnimationFrame(() => (id === 0 ? window.scrollTo(0, 0) : document.getElementById(id)?.scrollIntoView()));

  // Site hub ----------------------------------------------------------------
  function siteHub() {
    const S = window.PK_SITE || { title: 'protokit', projects: [] };
    const P = S.projects || [];
    const match = (p) => !state.q || [p.title, p.slug, p.description, p.status].join(' ').toLowerCase().includes(state.q.toLowerCase());
    const hl = (t) => {
      const i = state.q ? t.toLowerCase().indexOf(state.q.toLowerCase()) : -1;
      return i < 0 ? esc(t) : `${esc(t.slice(0, i))}<mark class="pk-match">${esc(t.slice(i, i + state.q.length))}</mark>${esc(t.slice(i + state.q.length))}`;
    };
    const route = docRoute();
    const brand = `<a class="pk-brand" href="#/"><span class="pk-logo" aria-hidden="true">pk</span><b>${esc(S.title)}</b></a>`;
    const side = () => [
      `<div class="pk-search" role="search">${icon('search')}<label for="pk-q" class="pk-sr">Filter projects</label><input id="pk-q" type="search" placeholder="Filter projects" autocomplete="off" spellcheck="false" value="${esc(state.q || '')}"><kbd aria-hidden="true">/</kbd></div>`,
      `<nav class="pk-nav" aria-label="Dashboard">${link('#/', 'Dashboard', { ico: 'layout-dashboard', current: !route })}</nav>`,
      navFold('projects', 'Projects', P.filter(match).map((p) => link(`projects/${p.slug}/`, p.title, { meta: `${p.built}/${p.screens}`, lead: `<span class="pk-dot" data-status="${esc(p.status)}" title="${esc(p.status)}"></span>` })), { meta: String(P.length), open: true }),
      state.info ? navFold('guide', 'Guide', state.info.docs.map((d) => link(`#/doc/${d.path}`, d.title, { ico: 'book-open', current: route?.path === d.path })), { open: false }) : '',
    ].join('');

    const projectsView = () => {
      const shown = P.filter(match);
      const built = P.reduce((n, p) => n + p.built, 0), screens = P.reduce((n, p) => n + p.screens, 0);
      const last = P.map((p) => p.updated).filter(Boolean).sort().pop() || '—';
      const rows = shown.map((p) => `<a class="pk-row" href="projects/${esc(p.slug)}/">
          <span class="pk-row-main"><span class="pk-row-title">${hl(p.title)}</span><span class="pk-row-sub"><code>${hl(p.slug)}</code> · ${hl(p.description)}</span></span>
          <span>${status(p.status)}</span>
          <span class="pk-progress"><b>${p.built}/${p.screens} screens</b>${meter(p.built, p.screens, `${p.title}: screens built`)}</span>
          <span class="pk-date">${esc(p.updated || '—')}</span>${icon('chevron-right')}</a>`).join('');
      return `<header class="pk-head">
          <div class="pk-eyebrow">${icon('layers')}<span>projects/</span></div>
          <h1>${esc(S.title)}</h1>
          ${S.description ? `<p>${esc(S.description)}</p>` : ''}
        </header>
        ${P.length ? `<dl class="pk-stats">
          <div class="pk-stat"><dt>Projects</dt><dd>${P.length}</dd></div>
          <div class="pk-stat"><dt>Screens built</dt><dd>${built}<small>/${screens}</small></dd>${meter(built, screens, 'Screens built')}</div>
          <div class="pk-stat"><dt>In progress</dt><dd>${P.filter((p) => p.status === 'In progress').length}</dd></div>
          <div class="pk-stat"><dt>Last update</dt><dd style="font-size:15px">${esc(last)}</dd></div>
        </dl>
        <section class="pk-section" aria-labelledby="pk-projects-h">
          <h2 class="pk-section-h" id="pk-projects-h"><span>All projects</span><span class="pk-count" aria-live="polite">${state.q ? `${shown.length} of ${P.length}` : P.length}</span></h2>
          ${shown.length ? `<div class="pk-table pk-projects"><div class="pk-row pk-row-head" aria-hidden="true"><span>Project</span><span>Status</span><span>Screens</span><span style="text-align:right">Updated</span><span></span></div>${rows}</div>`
            : `<div class="pk-empty"><p>No project matches <b>“${esc(state.q)}”</b>.</p></div>`}
        </section>` : `<div class="pk-empty"><h2>No projects yet</h2>
          <p>Start with a brief, then create the project from it:</p>
          <div class="md" style="width:100%"><pre><code>/pk-brief clinic-booking "online booking for a dental clinic"
/pk-init clinic-booking</code></pre></div>
          <p>Without an assistant: copy <code>briefs/_template.md</code> to <code>briefs/&lt;slug&gt;.md</code>, fill it in, then <code>npm run pk -- init &lt;slug&gt;</code>.</p></div>`}
        ${!isLocal && location.protocol === 'file:' ? `<p class="pk-notice">${icon('info')}<span>Opened from disk. Run <code>npm start</code> for the docs and live reload.</span></p>` : ''}`;
    };

    const render = async () => {
      const r = docRoute();
      let trail = crumbs('Dashboard'), content, doc = false;
      if (r && state.info) {
        const d = await docView(r.path);
        trail = crumbs(d.title, r.path);
        content = d.html;
        doc = true;
        document.title = `${d.title} · ${S.title}`;
      } else {
        content = projectsView();
        document.title = S.title;
      }
      paint(shell({ brand, side: side(), crumbs: trail, content, doc }));
      if (r?.anchor) scrollTo(r.anchor);
    };
    state.render = render;
    state.rerenderList = () => {
      const pos = document.getElementById('pk-q')?.selectionStart;
      render().then(() => { const q = document.getElementById('pk-q'); q?.focus(); q?.setSelectionRange(pos, pos); });
    };
    return render;
  }

  // Project hub -------------------------------------------------------------
  const M = window.MOCKUP || { modules: [] };
  const slug = (location.pathname.match(/\/projects\/([^/]+)\//) || [])[1] || '';
  const phaseKeys = Object.keys(M.phases || {});
  const screens = (M.modules || []).flatMap((m, mi) => m.screens.map((s) => ({ ...s, module: m, mi })));
  const ready = (list) => list.filter((s) => s.built).length;
  const lang = M.lang ? ` lang="${esc(M.lang)}"` : '';
  const badge = (p) => {
    if (!p) return '';
    const ph = M.phases?.[p] || {};
    return `<span class="pk-phase${ph.optional ? ' is-optional' : ''}" data-i="${phaseKeys.indexOf(p) + 1}" title="Delivery phase">${esc(ph.label || p)}</span>`;
  };
  const legal = (s) => (s.legal ? `<span class="pk-legal" title="Requires legal validation before implementation">${icon('scale')}<span class="pk-sr">Requires legal validation</span></span>` : '');
  let phase = ss.get('mk.phase');
  if (phase !== 'all' && !phaseKeys.includes(phase)) phase = 'all';
  const inPhase = (s) => phase === 'all' || s.phase === phase;

  function projectShell({ dir, current, content, crumbs, doc = false }) {
    const up = dir === 'screens' ? '../' : '';
    const docs = state.info?.projects?.[slug] || [];
    const brand = state.overview
      ? `<a class="pk-brand" href="${up}../../index.html">${icon('arrow-left')}<b>All projects</b></a>`
      : `<div class="pk-brand"><span class="pk-logo" aria-hidden="true">pk</span><b>${esc(M.title)}</b></div>`;
    const side = [
      navGroup(M.title || 'Project', [
        link(`${up}index.html#/`, 'Overview', { ico: 'layout-dashboard', current: current === 'overview' }),
        ...docs.map((d) => link(`${up}index.html#/doc/${d.path}`, d.title, { ico: { readme: 'notebook-text', brief: 'file-text', stack: 'layers', plan: 'list-checks' }[d.key] || 'file-text', current: current === d.path })),
      ]),
      navGroup('Modules', (M.modules || []).map((m, mi) => {
        const list = screens.filter((s) => s.mi === mi);
        return link(`${up}index.html#m-${mi}`, m.title, { ico: m.icon || 'layout-grid', meta: `${ready(list)}/${list.length}` });
      })),
    ].join('');
    const runnable = screens.filter((s) => s.built && inPhase(s));
    const tools = `<button type="button" class="pk-btn is-primary" data-hub-run title="${runnable.length ? `Walk through the ${runnable.length} built screen${runnable.length > 1 ? 's' : ''}${phase === 'all' ? '' : ' of this phase'} as one flow` : 'No built screens in this selection yet'}"${runnable.length ? '' : ' disabled'}>${icon('play')}<span class="pk-run-label">Run app</span></button>`;
    return shell({ brand, side, crumbs, tools, content, doc });
  }
  const projectCrumbs = (up, page) => (page ? crumbs(page, M.title || slug, `${up}index.html#/`) : crumbs('Overview', M.title || slug));

  function overview() {
    const shown = screens.filter(inPhase);
    const href = (s) => (s.built ? `screens/${s.id}.html` : `screens/_planned.html?id=${encodeURIComponent(s.id)}`);
    const [devIcon, devLabel] = DEVICE[M.device] || [];
    const phases = phaseKeys.length ? `<section class="pk-section" aria-labelledby="phases-h">
        <h2 class="pk-section-h" id="phases-h"><span>Phases</span>${screens.some((s) => s.legal) ? `<span class="pk-count" style="display:flex;gap:6px;align-items:center">${icon('scale')}legal validation</span>` : ''}</h2>
        <div class="pk-phases">${[['all', 'All phases', 'Every screen in the mockup', screens], ...phaseKeys.map((p) => [p, M.phases[p].name || M.phases[p].label || p, M.phases[p].desc || '', screens.filter((s) => s.phase === p)])]
          .map(([key, name, desc, list]) => `<button type="button" class="pk-phase-card" data-hub-phase="${esc(key)}" aria-pressed="${phase === key}">
            <span class="pk-phase-card-top">${key === 'all' ? '<span class="pk-phase">All</span>' : badge(key)}<span class="pk-count">${ready(list)}/${list.length}</span></span>
            <b>${esc(name)}</b>${desc ? `<p>${esc(desc)}</p>` : ''}${meter(ready(list), list.length, `${name}: screens built`)}</button>`).join('')}</div>
      </section>` : '';
    const modules = (M.modules || []).map((m, mi) => {
      const list = screens.filter((s) => s.mi === mi);
      const rows = list.filter(inPhase);
      if (!rows.length) return '';
      return `<section class="pk-section" id="m-${mi}" aria-labelledby="m-${mi}-h">
        <h2 class="pk-section-h" id="m-${mi}-h">${icon(m.icon || 'layout-grid')}<span>${esc(m.title)}</span><span class="pk-count">${ready(list)}/${list.length}</span></h2>
        <div class="pk-table pk-screens">${rows.map((s) => `<a class="pk-row${s.built ? '' : ' is-todo'}" href="${href(s)}">
            <span class="pk-row-main"><span class="pk-row-title"${lang}>${esc(s.name)}</span>
              <span class="pk-row-sub"${s.built ? '' : lang}>${s.built ? `<code>screens/${esc(s.id)}.html</code>` : esc(s.desc || 'Not built yet')}</span></span>
            <span class="pk-row-trail">${s.built ? '' : '<span class="pk-planned">planned</span>'}${legal(s)}${badge(s.phase)}</span>${icon('chevron-right')}</a>`).join('')}</div>
      </section>`;
    }).join('');
    return `<header class="pk-head">
        <div class="pk-eyebrow">${icon('folder')}<span>projects/${esc(slug)}/</span></div>
        <h1>${esc(M.title)}</h1>
        ${M.description ? `<p>${esc(M.description)}</p>` : ''}
        <div class="pk-meta">${M.status ? status(M.status) : ''}${devLabel ? `<span>${icon(devIcon)}${devLabel}</span>` : ''}
          <span>${icon('palette')}${esc((M.themes || ['light']).join(' · '))}</span>${M.lang ? `<span>${icon('languages')}<code>${esc(M.lang)}</code></span>` : ''}
          ${M.updated ? `<span>${icon('calendar')}<code>${esc(M.updated)}</code></span>` : ''}</div>
      </header>
      <dl class="pk-stats">
        <div class="pk-stat"><dt>Screens built</dt><dd>${ready(screens)}<small>/${screens.length}</small></dd>${meter(ready(screens), screens.length, 'Screens built')}</div>
        <div class="pk-stat"><dt>Planned</dt><dd>${screens.length - ready(screens)}</dd></div>
        <div class="pk-stat"><dt>Modules</dt><dd>${(M.modules || []).length}</dd></div>
        <div class="pk-stat"><dt>Phases</dt><dd>${phaseKeys.length || '—'}</dd></div>
      </dl>
      <p class="pk-hint">Run app walks the built screens as one flow. On any screen, <kbd>Esc</kbd> comes back here.</p>
      ${phases}${modules}`;
  }

  function projectHub() {
    const render = async () => {
      const r = docRoute();
      const docs = state.info?.projects?.[slug] || [];
      if (r && !docs.some((d) => d.path === r.path)) { location.href = `../../index.html${location.hash}`; return; }
      if (r && state.info) {
        const d = await docView(r.path);
        document.title = `${d.title} · ${M.title}`;
        paint(projectShell({ dir: '', current: r.path, crumbs: projectCrumbs('', d.title), content: d.html, doc: true }));
        if (r.anchor) scrollTo(r.anchor);
        return;
      }
      document.title = `${M.title} · screens`;
      paint(projectShell({ dir: '', current: 'overview', crumbs: projectCrumbs(''), content: overview() }));
      const id = location.hash.slice(1);
      if (id && !id.startsWith('/')) scrollTo(id);
    };
    state.render = render;
    return render;
  }

  function plannedPage() {
    const render = async () => {
      const id = new URLSearchParams(location.search).get('id');
      const i = screens.findIndex((s) => s.id === id);
      const s = screens[i];
      const back = `<a class="pk-btn" href="../index.html${s ? `#m-${s.mi}` : ''}">${icon('arrow-left')}Screen list</a>`;
      let content;
      if (!s) content = `<header class="pk-head"><h1>Unknown screen</h1><p>No screen with this id in <code>js/project.js</code>.</p></header><div>${back}</div>`;
      else {
        document.title = `${s.name} (planned) · ${M.title}`;
        const ph = M.phases?.[s.phase] || {};
        const pager = (k, dir, label) => {
          const t = screens[k];
          return t ? `<a class="is-${dir}" href="${t.built ? `${t.id}.html` : `_planned.html?id=${encodeURIComponent(t.id)}`}">${icon(dir === 'prev' ? 'chevron-left' : 'chevron-right')}
            <span><span>${label}${t.built ? '' : ' · planned'}</span><span class="pk-row-title"${lang}>${esc(t.name)}</span></span></a>` : '<span></span>';
        };
        content = `<header class="pk-head">
            <div class="pk-eyebrow">${icon('file-dashed')}<span>screens/${esc(s.id)}.html</span></div>
            <h1${lang}>${esc(s.name)}</h1>
            <div class="pk-meta"><span class="pk-planned">planned</span>${badge(s.phase)}${legal(s)}<span>${icon(s.module.icon || 'layout-grid')}${esc(s.module.title)}</span></div>
          </header>
          <article class="pk-sheet">
            <p>This screen is not built yet. It is listed in the brief; this page shows what it will contain.</p>
            ${s.desc ? `<h2>Key content</h2><p${lang}>${esc(s.desc)}</p>` : ''}
            <dl class="pk-facts">
              ${s.phase ? `<dt>Phase</dt><dd>${esc(ph.label || s.phase)}${ph.name ? ` · ${esc(ph.name)}` : ''}</dd>` : ''}
              <dt>File</dt><dd><code>screens/${esc(s.id)}.html</code></dd>
              ${s.legal ? '<dt>Note</dt><dd>Requires legal validation before implementation</dd>' : ''}
            </dl>
          </article>
          <nav class="pk-pager" aria-label="Screens in brief order">${pager(i - 1, 'prev', 'Previous')}${pager(i + 1, 'next', 'Next')}</nav>`;
      }
      paint(projectShell({ dir: 'screens', current: '', crumbs: projectCrumbs('../', s ? s.name || s.id : 'Unknown screen'), content }));
    };
    state.render = render;
    return render;
  }

  // Events ------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const t = e.target;
    const ui = t.closest('[data-pk-ui]');
    if (ui) { ls.set(UI_KEY, ui.dataset.pkUi); applyUi(); document.querySelectorAll('[data-pk-ui]').forEach((b) => b.setAttribute('aria-pressed', b === ui)); return; }
    if (t.closest('[data-pk-menu]')) { state.open = !state.open; state.render(); return; }
    const anchor = t.closest('.md a[href^="#"]:not([href^="#/"]), a[data-pk-anchor]');
    if (anchor && docRoute()) {
      e.preventDefault();
      const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
      history.replaceState(null, '', `#/doc/${docRoute().path}::${id}`);
      scrollTo(id);
      return;
    }
    if (state.open && t.closest('.pk-side a')) state.open = false;
    const p = t.closest('[data-hub-phase]');
    if (p) {
      phase = p.dataset.hubPhase;
      ss.set('mk.phase', phase);
      state.render().then(() => document.querySelector(`[data-hub-phase="${phase}"]`)?.focus());
      return;
    }
    if (t.closest('[data-hub-run]')) {
      const up = location.pathname.includes('/screens/') ? '' : 'screens/';
      const steps = screens.filter((s) => s.built && inPhase(s)).map((s) => [`screens/${s.id}.html`, s.name]);
      if (!steps.length) return;
      ss.set('mk.flow', JSON.stringify(steps));
      location.href = `${up}${steps[0][0].slice(8)}`;
    }
  });
  document.addEventListener('toggle', (e) => {
    const f = e.target.closest?.('[data-pk-fold]');
    if (f) ls.set(`pk.nav.${f.dataset.pkFold}`, f.open ? '1' : '0');
  }, true);
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'pk-q') return;
    state.q = e.target.value.trim();
    state.rerenderList?.();
  });
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === '/' && !typing && document.getElementById('pk-q')) { e.preventDefault(); document.getElementById('pk-q').focus(); return; }
    if (e.key !== 'Escape') return;
    if (state.open) { e.preventDefault(); state.open = false; state.render(); return; }
    if (e.target.id === 'pk-q' && state.q) { state.q = ''; state.rerenderList(); return; }
    if (state.planned && !e.defaultPrevented) location.href = document.querySelector('.pk-content .pk-btn[href^="../index.html"]')?.getAttribute('href') || '../index.html';
  });
  const viewOf = (r) => (r ? `doc:${r.path}` : 'overview');
  addEventListener('hashchange', () => {
    const r = docRoute();
    const anchor = r ? r.anchor : (location.hash.length > 1 && !location.hash.startsWith('#/') ? location.hash.slice(1) : '');
    if (viewOf(r) === state.view) { if (anchor) scrollTo(anchor); else scrollTo(0); return; }
    state.view = viewOf(r);
    state.render().then(() => { if (!anchor) window.scrollTo(0, 0); });
  });
  addEventListener('pk:md', (e) => { if (docRoute()?.path === e.detail) state.render(); });

  // "All projects" only for visitors who can open the overview: on a protected site, a project password
  // opens just its project and the overview answers 401. Opened from disk or the local server it always shows.
  const checkOverview = (up) => {
    state.overview = location.protocol === 'file:' || isLocal;
    if (state.overview) return;
    fetch(`${up}../../`, { method: 'HEAD', cache: 'no-store' }).then((r) => { if (r.ok) { state.overview = true; state.render(); } }).catch(() => {});
  };
  const mount = async (make, up = '') => {
    // Older index.html files mount on <main class="hub">: replace it, the shell has its own <main>
    const el = document.querySelector('[data-hub]');
    root = document.createElement('div');
    if (el) el.replaceWith(root); else document.body.prepend(root);
    checkOverview(up);
    const render = make();
    state.view = viewOf(docRoute());
    await render();
    state.info = await info;
    if (state.info) await render();
  };
  return {
    site: () => mount(siteHub),
    hub: () => mount(projectHub),
    planned: () => { state.planned = true; return mount(plannedPage, '../'); },
  };
})();
