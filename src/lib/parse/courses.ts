import type { Course, CoursesData } from '../types';
import { clean, textWithoutIcons } from './util';

const COURSE_RE = /^\/dotlrn\/classes\/([^/]+)\/([^/]+)\/(([A-Z]+-\d+-\d{4})\.([A-Z]+)\.([A-Z0-9]+)\.(\d+))\/?/;

export function courseFromPath(path: string, name = ''): Course | null {
  const m = COURSE_RE.exec(path);
  if (!m) return null;
  return {
    id: m[3],
    dept: m[1],
    code: m[2],
    period: m[4],
    campus: m[5],
    group: m[7],
    name: clean(name.replace(/\s+GR\s*\d+\s*$/i, '')) || m[2],
    base: `/dotlrn/classes/${m[1]}/${m[2]}/${m[3]}/`,
  };
}

/** Etiqueta del nodo del árbol que contiene al link ("SEMESTRE 2 2026"). */
function groupLabel(a: Element): string {
  const li = a.closest('ul')?.closest('li');
  if (!li) return '';
  const own = [...li.childNodes]
    .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !['UL', 'OL'].includes((n as Element).tagName)))
    .map((n) => (n.nodeType === 1 ? textWithoutIcons(n as Element) : n.textContent))
    .join(' ');
  return clean(own);
}

const PERIOD_LABEL: Record<string, string> = { S: 'Semestre', V: 'Verano', H: 'Humanística', B: 'Bimestre', T: 'Trimestre' };
export function periodLabel(period: string): string {
  const [t, n, y] = period.split('-');
  return `${PERIOD_LABEL[t] ?? t} ${n} ${y}`;
}

/**
 * Cursos del árbol "Cursos" del inicio (#tree-dotlrn_class_instance), agrupados
 * por periodo. El semestre actual es el nodo que TEC Digital marca con
 * name="current"; si no viene marcado, el primero del árbol.
 *
 * Solo se mira ese árbol: el resto de la página (notificaciones, avisos) puede
 * tener links a cursos viejos, y antes el primero que apareciera en cualquier
 * lado decidía cuál era el "semestre actual".
 */
export function parseCourses(doc: Document): CoursesData {
  const tree = doc.querySelector('#tree-dotlrn_class_instance') ?? doc;
  const groups = new Map<string, { label: string; courses: Course[]; current: boolean }>();
  const seen = new Set<string>();
  for (const a of tree.querySelectorAll('a[href*="/dotlrn/classes/"]')) {
    let path: string;
    try { path = new URL(a.getAttribute('href') ?? '', 'https://x').pathname; } catch { continue; }
    const c = courseFromPath(path, textWithoutIcons(a));
    if (!c || seen.has(c.id)) continue;
    // Solo links que son la raíz del curso (no noticias, documentos, etc.).
    if (path.replace(/\/$/, '') !== c.base.replace(/\/$/, '')) continue;
    seen.add(c.id);
    const key = c.period;
    if (!groups.has(key)) {
      const node = a.closest('ul')?.closest('li');
      groups.set(key, { label: groupLabel(a) || periodLabel(c.period), courses: [], current: node?.getAttribute('name') === 'current' });
    }
    groups.get(key)!.courses.push(c);
  }
  const all = [...groups.values()];
  const marked = all.filter((g) => g.current);
  const currentGroups = marked.length ? marked : all.slice(0, 1);
  const past = all.filter((g) => !currentGroups.includes(g));
  return {
    current: currentGroups.flatMap((g) => g.courses),
    currentLabel: currentGroups.map((g) => prettyLabel(g.label)).join(' + '),
    past: past.map((g) => ({ label: prettyLabel(g.label), courses: g.courses })),
  };
}

/** "SEMESTRE 2 2026" → "Semestre 2 2026". */
function prettyLabel(s: string): string {
  return s.toLowerCase().replace(/^\p{L}/u, (c) => c.toUpperCase());
}
