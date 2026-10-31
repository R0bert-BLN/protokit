window.MK = window.MK || {};
(() => {

MK.state = {
  _s: {},
  _subs: [],
  get: (k) => MK.state._s[k],
  set(k, v) { MK.state._s[k] = v; MK.state._subs.forEach((fn) => fn(k, v)); },
  on(fn) { MK.state._subs.push(fn); },
};

MK.toast = (msg, ms = 2200) => {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.querySelector('.device').append(el);
  setTimeout(() => el.remove(), ms);
};

MK.open = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  el.querySelector('button, a, input, select, textarea')?.focus();
};
MK.close = (el) => { el.closest('.overlay').hidden = true; };

MK.screen = ({ title, phase, tab, back = true, actions = '', render }) => {
  const root = document.body.dataset.root || '';
  const device = document.querySelector('.device');
  const main = device.querySelector('main');
  document.title = `${title} · ${MK.config.appName}`;

  const backBtn = back ? `<a class="icon-btn" href="${typeof back === 'string' ? back : root + 'index.html'}" aria-label="Back" data-back>${MK.ui.icon('chevron-left')}</a>` : '';
  device.insertAdjacentHTML('afterbegin', `<header class="topbar">${backBtn}<h1>${MK.esc(title)}</h1>${phase ? MK.ui.phase(phase) : ''}${actions}</header>`);

  if (tab !== false && MK.config.tabs?.length) {
    device.insertAdjacentHTML('beforeend', `<nav class="tabbar" aria-label="Main navigation">${MK.config.tabs
      .map((t) => `<a href="${root}${t.href}" ${t.id === tab ? 'aria-current="page"' : ''}>${t.icon ? MK.ui.icon(t.icon) : ''}<span>${MK.esc(t.label)}</span></a>`)
      .join('')}</nav>`);
  }

  if (render) main.innerHTML = render();
  MK.refreshIcons();
};

MK.refreshIcons = () => window.lucide?.createIcons?.();

document.addEventListener('click', (e) => {
  const t = e.target;

  const opener = t.closest('[data-open]');
  if (opener) { e.preventDefault(); MK.open(opener.dataset.open); return; }
  if (t.closest('[data-close]') || t.classList.contains('overlay')) { MK.close(t.closest('.overlay') || t); return; }

  const back = t.closest('[data-back]');
  if (back && history.length > 1 && document.referrer) { e.preventDefault(); history.back(); return; }

  const tab = t.closest('[role="tab"]');
  if (tab) {
    const box = tab.closest('[data-tabs]');
    box.querySelectorAll('[role="tab"]').forEach((b) => {
      const on = b === tab;
      b.setAttribute('aria-selected', on);
      box.querySelector('#' + b.getAttribute('aria-controls')).hidden = !on;
    });
    return;
  }

  const chip = t.closest('[data-chip]');
  if (chip) {
    const group = chip.closest('.chips');
    group.querySelectorAll('[data-chip]').forEach((c) => c.setAttribute('aria-pressed', c === chip));
    group.dispatchEvent(new CustomEvent('chipchange', { bubbles: true, detail: chip.textContent }));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = document.querySelectorAll('.overlay:not([hidden])');
  if (!open.length) return;
  e.preventDefault(); // handled here: js/review.js leaves the screen only on an Esc nobody used
  open.forEach((o) => { o.hidden = true; });
});

document.addEventListener('DOMContentLoaded', MK.refreshIcons);
})();
