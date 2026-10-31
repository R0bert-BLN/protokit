// Identical in every project: change it in .ai/templates/project, then run node scripts/pk.mjs sync.
// Load it after the app's own scripts. An app that handles Esc itself (closing a menu or a dialog) calls e.preventDefault().
(() => {
  const M = window.MOCKUP || {};
  const storage = (area) => ({
    get(k) { try { return window[area].getItem(k); } catch { return null; } },
    set(k, v) { try { window[area].setItem(k, v); } catch {} },
    del(k) { try { window[area].removeItem(k); } catch {} },
  });
  const ls = storage('localStorage'), ss = storage('sessionStorage');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const icons = () => window.lucide?.createIcons?.({ attrs: { 'stroke-width': 1.75 } });
  const HUB = '../index.html';

  // The review tools follow the tool theme of the hub (pk.ui); the mockup has its own theme (data-theme)
  const ui = ls.get('pk.ui');
  document.documentElement.dataset.ui = ui === 'light' || ui === 'dark' ? ui : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const project = (location.pathname.match(/\/projects\/([^/]+)\/(?:screens\/)?[^/]*$/) || [])[1] || M.title || 'mockup';
  const THEME_KEY = `mk.theme.${project}`;
  const themes = M.themes?.length ? M.themes : ['light'];
  let theme = ls.get(THEME_KEY);
  if (!themes.includes(theme)) theme = themes.includes('dark') && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : themes[0];
  document.documentElement.dataset.theme = theme;
  const next = () => themes[(themes.indexOf(theme) + 1) % themes.length];

  let steps = null;
  try { steps = JSON.parse(ss.get('mk.flow')); } catch {}
  const file = location.pathname.split('/').pop();
  const i = Array.isArray(steps) ? steps.findIndex(([href]) => href.split('/').pop() === file) : -1;
  const step = (k, name, label) => {
    const s = steps[k];
    return s ? `<a class="mk-btn" href="${esc(s[0].split('/').pop())}" aria-label="${label}: ${esc(s[1])}" title="${label}: ${esc(s[1])}">${icon(name)}</a>`
      : `<span class="mk-btn" aria-disabled="true">${icon(name)}</span>`;
  };

  const screens = (M.modules || []).flatMap((m) => m.screens);
  const dir = (p) => p.slice(0, p.lastIndexOf('/') + 1);
  const notBuilt = (href) => {
    let u;
    try { u = new URL(href, location.href); } catch { return false; }
    if (u.protocol !== location.protocol || dir(u.pathname) !== dir(location.pathname)) return false;
    const f = u.pathname.split('/').pop();
    if (f === '_planned.html') return true;
    const s = screens.find((x) => `${x.id}.html` === f);
    return !!s && !s.built;
  };
  const NOT_BUILT = 'Not implemented yet';
  window.MKReview = {
    notBuilt,
    go(href) {
      if (notBuilt(href)) { alert(NOT_BUILT); return false; }
      location.href = href;
      return true;
    },
  };
  // Capture phase: runs before the app's own click handlers, which then never see the click
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || !notBuilt(a.getAttribute('href'))) return;
    e.preventDefault();
    e.stopPropagation();
    alert(NOT_BUILT);
  }, true);

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (document.querySelector('.overlay:not([hidden]), [data-overlay], [aria-haspopup][aria-expanded="true"], dialog[open]')) return;
    if (e.target.matches?.('input, textarea, select, [contenteditable="true"]')) { e.target.blur(); return; }
    ss.del('mk.flow');
    location.href = `${HUB}#phases-h`;
  });

  // Review rail on the right edge: previous / next in Run app, the theme switch. Dragged up or down
  // (or Alt + arrow keys) so it never covers the UI under review; no fixed bar over the screen.
  const flow = i >= 0, themed = themes.length > 1;
  if (flow || themed) {
    const Y_KEY = `mk.themeY.${project}`;
    const rail = document.createElement('div');
    rail.className = 'mk-rail';
    rail.setAttribute('role', 'toolbar');
    rail.setAttribute('aria-label', flow ? 'Run app · drag to move' : 'Review tools · drag to move');
    rail.setAttribute('aria-orientation', 'vertical');
    let y = parseFloat(ls.get(Y_KEY));
    if (!(y >= 0 && y <= 1)) y = 0.5;
    const clamp = (top) => Math.min(Math.max(8, top), innerHeight - rail.offsetHeight - 8);
    const place = () => { rail.style.top = `${clamp(y * innerHeight - rail.offsetHeight / 2)}px`; };
    const themeBtn = () => (themed ? `<button type="button" class="mk-btn" data-mk-theme aria-label="Switch to the ${next()} theme" title="${next()[0].toUpperCase()}${next().slice(1)} theme">${icon(next() === 'dark' ? 'moon' : 'sun')}</button>` : '');
    const paint = () => {
      rail.innerHTML = `<span class="mk-grip" aria-hidden="true" title="Drag to move"></span>
        ${flow ? step(i - 1, 'chevron-up', 'Previous screen') : ''}${themeBtn()}${flow ? step(i + 1, 'chevron-down', 'Next screen') : ''}`;
      icons();
    };
    let start = null, dragged = false;
    rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      start = { y: e.clientY, top: rail.offsetTop, id: e.pointerId };
      dragged = false;
    });
    rail.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dy = e.clientY - start.y;
      if (!dragged && Math.abs(dy) < 4) return;
      if (!dragged) { dragged = true; rail.setPointerCapture(start.id); rail.classList.add('is-dragging'); }
      const top = clamp(start.top + dy);
      rail.style.top = `${top}px`;
      y = (top + rail.offsetHeight / 2) / innerHeight;
    });
    const end = () => {
      if (!start) return;
      start = null;
      rail.classList.remove('is-dragging');
      if (dragged) ls.set(Y_KEY, y.toFixed(4));
    };
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointercancel', end);
    // Capture: a drag that ends on a button or link is not a click
    rail.addEventListener('click', (e) => {
      if (dragged) { dragged = false; e.preventDefault(); e.stopPropagation(); return; }
      if (!e.target.closest('[data-mk-theme]')) return;
      theme = next();
      document.documentElement.dataset.theme = theme;
      ls.set(THEME_KEY, theme);
      paint();
      rail.querySelector('[data-mk-theme]')?.focus();
    }, true);
    rail.addEventListener('keydown', (e) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      y = Math.min(1, Math.max(0, y + (e.key === 'ArrowUp' ? -0.05 : 0.05)));
      place();
      ls.set(Y_KEY, y.toFixed(4));
    });
    document.body.append(rail);
    paint();
    place();
    addEventListener('resize', place);
  }
  icons();
})();
