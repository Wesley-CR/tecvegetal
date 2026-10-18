import type { Link } from '../types';

export const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Minúsculas, sin tildes ni dos puntos: para comparar etiquetas del sitio. */
export const norm = (s: string | null | undefined) =>
  clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s*:\s*$/, '');

/** Texto visible sin los nombres de íconos de Material ("beenhere", "expand_less"…). */
export function textWithoutIcons(el: Element): string {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll('i, .material-icons, [class*="material-icons"], [class*="material-symbols"]').forEach((n) => n.remove());
  return clean(c.textContent);
}

export function num(s: string | null | undefined): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(s ?? '');
  return m ? parseFloat(m[0].replace(',', '.')) : null;
}

/** "95.2 / 100" → [95.2, 100]; "-- / 100" → [null, 100]. */
export function fraction(s: string | null | undefined): [number | null, number | null] {
  const t = clean(s);
  const m = /^(--|-?[\d.,]+)\s*\/\s*([\d.,]+)/.exec(t);
  if (!m) return [num(t), null];
  return [m[1] === '--' ? null : num(m[1]), num(m[2])];
}

export function links(el: Element | null | undefined, baseUrl: string): Link[] {
  if (!el) return [];
  return [...el.querySelectorAll('a[href]')]
    .map((a) => {
      const raw = a.getAttribute('href') ?? '';
      if (/^(javascript:|#)/i.test(raw)) return null;
      let href: string;
      try { href = new URL(raw, baseUrl).href; } catch { return null; }
      return { text: clean(a.textContent) || href, href };
    })
    .filter((x): x is Link => !!x);
}
