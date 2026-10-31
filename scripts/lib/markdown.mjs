// Small Markdown renderer for the local docs views: GFM tables, task lists, fenced code, front matter.
// Raw HTML is escaped, not rendered; HTML comments are dropped.
import { html as esc, frontMatter } from './util.mjs';

const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

export function render(text, { link = (href) => href } = {}) {
  const { meta, body } = frontMatter(text.replace(/\r\n?/g, '\n'));
  const toc = [];
  const ids = new Map();
  const uid = (s) => {
    const base = slugify(s) || 'section';
    const n = ids.get(base) || 0;
    ids.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };

  const inline = (s) => {
    const codes = [];
    let out = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, c) => `\u0000${codes.push(`<code>${esc(c.trim())}</code>`) - 1}\u0000`);
    out = esc(out)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt, src) => `<img src="${link(src, true)}" alt="${alt}" loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, t, href) => {
        const to = link(href.replace(/&amp;/g, '&'));
        const ext = /^https?:/.test(to);
        return `<a href="${esc(to)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
      })
      .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
      .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/ {2,}\n/g, '<br>\n');
    return out.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
  };

  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  const isTableSep = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

  function blocks(lines) {
    const out = [];
    let i = 0;
    const para = [];
    const flush = () => { if (para.length) { out.push(`<p>${inline(para.join('\n'))}</p>`); para.length = 0; } };
    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (!line.trim()) { flush(); i++; continue; }
      if ((m = line.match(/^\s*(```+|~~~+)\s*([\w+-]*)/))) {
        flush();
        const fence = m[1];
        const code = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
        i++;
        out.push(`<pre${m[2] ? ` data-lang="${esc(m[2])}"` : ''}><code>${esc(code.join('\n'))}</code></pre>`);
        continue;
      }
      if ((m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) {
        flush();
        const level = m[1].length;
        const content = inline(m[2]);
        const id = uid(m[2]);
        if (level === 2 || level === 3) toc.push({ level, id, text: content.replace(/<[^>]+>/g, '') });
        out.push(`<h${level} id="${id}"><a class="md-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${content}</h${level}>`);
        i++;
        continue;
      }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }
      if (/^\s*>/.test(line)) {
        flush();
        const q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*> ?/, ''));
        out.push(`<blockquote>${blocks(q)}</blockquote>`);
        continue;
      }
      if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flush();
        const head = cells(line);
        const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
        const td = (tag, c, k) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ''}>${inline(c)}</${tag}>`;
        out.push(`<div class="md-table"><table><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, k) => td('td', r[k] ?? '', k)).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if ((m = line.match(/^(\s*)([-*+]|\d+[.)])\s+/))) {
        flush();
        const indent = m[1].length;
        const ordered = /\d/.test(m[2]);
        const items = [];
        while (i < lines.length) {
          const l = lines[i];
          const im = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (im && im[1].length === indent) { items.push([im[3]]); i++; continue; }
          if (!l.trim()) {
            const nx = lines[i + 1];
            if (nx && (nx.match(/^(\s*)/)[1].length > indent) ) { items[items.length - 1].push(''); i++; continue; }
            break;
          }
          if (l.match(/^(\s*)/)[1].length > indent) { items[items.length - 1].push(l.slice(Math.min(indent + 2, l.match(/^(\s*)/)[1].length))); i++; continue; }
          if (im) break;
          if (items.length) { items[items.length - 1].push(l.trim()); i++; continue; } // lazy continuation
          break;
        }
        const start = ordered ? Number(m[2].replace(/\D/g, '')) : 1;
        const lis = items.map((it) => {
          let first = it[0];
          let task = '';
          const t = first.match(/^\[([ xX])\]\s+(.*)$/);
          if (t) { task = `<input type="checkbox" disabled${t[1] !== ' ' ? ' checked' : ''}> `; first = t[2]; }
          const rest = it.slice(1);
          const nested = rest.length ? blocks(rest) : '';
          return `<li${task ? ' class="md-task"' : ''}>${task}${inline(first)}${nested}</li>`;
        });
        out.push(ordered ? `<ol${start !== 1 ? ` start="${start}"` : ''}>${lis.join('')}</ol>` : `<ul>${lis.join('')}</ul>`);
        continue;
      }
      para.push(line);
      i++;
    }
    flush();
    return out.join('\n');
  }

  const clean = body.replace(/<!--[\s\S]*?-->/g, '');
  const title = clean.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, '') || meta.title || '';
  return { meta, title, toc, html: blocks(clean.split('\n')) };
}
