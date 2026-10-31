// COMPONENT INDEX: one line per function, at most 100 characters (call → main CSS class — use).
// Read this instead of the whole file; add a line with every new function.
//   MK.esc(text) — escape text for HTML
//   MK.ui.icon(name) → i[data-lucide] — Lucide icon
//   MK.ui.initials(name), avatar(name) → .avatar — two-letter initials, initials in a circle
//   MK.ui.badge(text, tone) → .badge — status label; tone: success | warning | danger
//   MK.ui.phase(key) → .badge.phase — phase badge from js/project.js
//   MK.ui.progress(pct) → .progress — progress bar
//   MK.ui.button(label, { variant, href, attrs }) → .btn — variant: secondary|ghost|danger|block
//   MK.ui.card(inner, { href, cls }) → .card — card, or link card with href
//   MK.ui.sectionTitle(title, action) → .section-title — heading with an optional action
//   MK.ui.listRow({ title, subtitle, lead, trail, href }) → .list-row — row with lead, trail slots
//   MK.ui.list(rows) → .list — wraps listRow() output
//   MK.ui.chips(items, selected) → .chips — single-choice filter; emits "chipchange"
//   MK.ui.tabs([{ id, label, content }]) → .tabs — tabs with panels (switching in app.js)
//   MK.ui.sheet(id, title, inner, { center }) → .overlay — sheet or dialog; data-open="<id>"
//   MK.ui.note(text) → .note — notice, e.g. the legal note
// END INDEX
window.MK = window.MK || {};

MK.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

MK.ui = {
  icon: (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`,

  initials: (name) => MK.esc(name.split(' ').map((p) => p[0]).slice(0, 2).join('')),

  avatar: (name) => `<span class="avatar" aria-hidden="true">${MK.ui.initials(name)}</span>`,

  badge: (text, tone = '') => `<span class="badge ${tone}">${MK.esc(text)}</span>`,

  phase: (p) => `<span class="badge phase ${p}">${MK.esc(window.MOCKUP?.phases?.[p]?.label || p.toUpperCase())}</span>`,

  progress: (pct) => `<div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`,

  button: (label, { variant = '', href, attrs = '' } = {}) =>
    href
      ? `<a class="btn ${variant}" href="${href}" ${attrs}>${MK.esc(label)}</a>`
      : `<button type="button" class="btn ${variant}" ${attrs}>${MK.esc(label)}</button>`,

  card: (inner, { href, cls = '' } = {}) =>
    href ? `<a class="card ${cls}" href="${href}">${inner}</a>` : `<section class="card ${cls}">${inner}</section>`,

  sectionTitle: (title, action = '') => `<div class="section-title"><h2>${MK.esc(title)}</h2>${action}</div>`,

  listRow: ({ title, subtitle = '', lead = '', trail = '', href }) => {
    const inner = `${lead}<div class="grow"><div>${MK.esc(title)}</div>${subtitle ? `<div class="small muted">${MK.esc(subtitle)}</div>` : ''}</div>${trail}`;
    return href ? `<a class="list-row" href="${href}">${inner}</a>` : `<div class="list-row">${inner}</div>`;
  },

  list: (rows) => `<div class="list">${rows.join('')}</div>`,

  chips: (items, selected) =>
    `<div class="chips" role="group">${items.map((i) => `<button type="button" class="chip" aria-pressed="${i === selected}" data-chip>${MK.esc(i)}</button>`).join('')}</div>`,

  tabs: (items) => `
    <div data-tabs>
      <div class="tabs" role="tablist">${items.map((t, i) => `<button type="button" role="tab" aria-selected="${i === 0}" aria-controls="tab-${t.id}">${MK.esc(t.label)}</button>`).join('')}</div>
      ${items.map((t, i) => `<div role="tabpanel" id="tab-${t.id}" ${i ? 'hidden' : ''}>${t.content}</div>`).join('')}
    </div>`,

  sheet: (id, title, inner, { center = false } = {}) => `
    <div class="overlay ${center ? 'center' : ''}" id="${id}" hidden role="dialog" aria-modal="true" aria-label="${MK.esc(title)}">
      <div class="sheet"><div class="row between"><h2>${MK.esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${MK.ui.icon('x')}</button></div>${inner}</div>
    </div>`,

  note: (text) => `<p class="note">${MK.esc(text)}</p>`,
};
