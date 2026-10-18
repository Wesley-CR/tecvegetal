// Limpia HTML de portlets del sitio (lo escriben los profes) para reinsertarlo en
// TEC Vegetal: solo etiquetas de contenido, sin scripts, estilos ni handlers, y con los
// links resueltos contra la URL de la página.

const ALLOWED = new Set([
  'P', 'BR', 'UL', 'OL', 'LI', 'A', 'STRONG', 'B', 'EM', 'I', 'U', 'H3', 'H4', 'H5', 'H6',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'SPAN', 'DIV', 'IMG', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR',
]);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'NOSCRIPT', 'LINK', 'META']);

export function sanitize(src: Element, pageUrl: string): string {
  const doc = src.ownerDocument;
  const out = doc.createElement('div');

  const walk = (from: Node, to: Element) => {
    for (const n of [...from.childNodes]) {
      if (n.nodeType === 3) { to.append(n.textContent ?? ''); continue; }
      if (n.nodeType !== 1) continue;
      const el = n as Element;
      if (DROP.has(el.tagName)) continue;
      // Íconos de Material (texto como "expand_less") no se copian.
      if (el.tagName === 'I' && /material-(icons|symbols)/.test(el.className)) continue;
      if (!ALLOWED.has(el.tagName)) { walk(el, to); continue; }
      const copy = doc.createElement(el.tagName.toLowerCase());
      if (el.tagName === 'A') {
        const raw = el.getAttribute('href') ?? '';
        if (raw && !/^(javascript:|#)/i.test(raw)) {
          try {
            const u = new URL(raw, pageUrl);
            if (/^(https?|mailto):$/.test(u.protocol)) copy.setAttribute('href', u.href);
            if (u.origin !== new URL(pageUrl).origin) { copy.setAttribute('target', '_blank'); copy.setAttribute('rel', 'noopener'); }
          } catch { /* href inválido: queda como texto */ }
        }
      } else if (el.tagName === 'IMG') {
        try {
          const u = new URL(el.getAttribute('src') ?? '', pageUrl);
          if (!/^https?:$/.test(u.protocol)) continue;
          copy.setAttribute('src', u.href);
          copy.setAttribute('alt', el.getAttribute('alt') ?? '');
          copy.setAttribute('loading', 'lazy');
        } catch { continue; }
      } else if (el.tagName === 'TD' || el.tagName === 'TH') {
        for (const a of ['colspan', 'rowspan']) if (el.hasAttribute(a)) copy.setAttribute(a, el.getAttribute(a)!);
      }
      walk(el, copy);
      to.append(copy);
    }
  };
  walk(src, out);
  return out.innerHTML.replace(/(\s*<br>\s*){3,}/g, '<br><br>').trim();
}
