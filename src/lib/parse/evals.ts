import { parseAnsiCR, parseDmyCR } from '../dates';
import type { Assignment, Category, EvalsData, Link } from '../types';
import { clean, fraction, links, norm, num } from './util';

/**
 * Página de Evaluaciones del estudiante:
 *   #content_assigns
 *     .title_acor_grade        ← categoría (nombre + peso + subtotal)
 *     .container_accor_detail  ← sus asignaciones
 *       .container_accor[assign_id]
 *       .title_acor            ← copia colapsada, se ignora
 */
export function parseEvals(doc: Document, pageUrl: string): EvalsData {
  const categories: Category[] = [];
  for (const h of doc.querySelectorAll('#content_assigns .title_acor_grade, .title_acor_grade')) {
    if (categories.some((c) => c.id === h.id && h.id)) continue;
    const label = h.querySelector('.clase');
    const title = label?.getAttribute('title') ?? label?.textContent ?? '';
    const sub = h.querySelector('.sub_total');
    const weightAttr = sub?.getAttribute('item_weight');
    const pct = /\(([\d.,]+)\s*%\)/.exec(title);
    const detail = h.nextElementSibling?.classList.contains('container_accor_detail') ? h.nextElementSibling : null;
    const assignments = detail
      ? [...detail.querySelectorAll(':scope > .container_accor')].map((el) => parseAssignment(el, pageUrl))
      : [];
    categories.push({
      id: h.id || `cat-${categories.length}`,
      name: clean(title.replace(/\([\d.,]+\s*%\)/, '')) || clean(label?.textContent),
      weight: weightAttr != null ? num(weightAttr) : pct ? num(pct[1]) : null,
      earned: /--/.test(sub?.textContent ?? '') ? null : num(sub?.textContent),
      assignments,
    });
  }

  // "Nota Total" lo pinta el JS de la página, así que normalmente no viene en el
  // HTML: se calcula sumando los subtotales de cada rubro.
  const totalMatch = /Nota\s+Total[^\d-]*(--|[\d.,]+)\s*\/\s*([\d.,]+)/i.exec(doc.body?.textContent ?? '');
  const earned = categories.filter((c) => c.earned != null);
  const weights = categories.reduce((s, c) => s + (c.weight ?? 0), 0);
  return {
    categories,
    total: totalMatch && totalMatch[1] !== '--'
      ? num(totalMatch[1])
      : earned.length ? round2(earned.reduce((s, c) => s + c.earned!, 0)) : null,
    totalOf: totalMatch ? num(totalMatch[2]) : weights || null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Algunos profes escriben la descripción como HTML y el sitio la escapa dos veces
 * ("&lt;p>La r&amp;uacute;brica…"). Se desescapa hasta tener HTML real.
 */
function decodeDescription(el: Element | undefined, pageUrl: string): { text: string; links: Link[] } {
  if (!el) return { text: '', links: [] };
  let node: Element = el;
  for (let i = 0; i < 3 && /&lt;|&amp;[a-z]+;|<\w+[^>]*>/i.test(node.textContent ?? '') && !node.querySelector('*'); i++) {
    node = new DOMParser().parseFromString(`<div>${node.textContent}</div>`, 'text/html').body.firstElementChild!;
  }
  node.querySelectorAll('br, p, li, div').forEach((n) => n.append('\n'));
  const text = (node.textContent ?? '').split('\n').map(clean).filter(Boolean).join('\n');
  return { text, links: links(node, pageUrl) };
}

function fields(el: Element): Map<string, Element> {
  const map = new Map<string, Element>();
  for (const p of el.querySelectorAll('p.title_subsection')) {
    const key = norm(p.textContent);
    let val: Element | null = p.nextElementSibling;
    if (!val || !val.classList.contains('body_style')) val = p.parentElement?.querySelector('.body_style') ?? null;
    if (key && val && !map.has(key)) map.set(key, val);
  }
  return map;
}

const find = (m: Map<string, Element>, prefix: string) => {
  for (const [k, v] of m) if (k.startsWith(prefix)) return v;
  return undefined;
};

function yesChecked(el: Element | undefined): boolean {
  const first = el?.querySelector('input[type=radio]') as HTMLInputElement | null;
  return !!first && (first.checked || first.hasAttribute('checked'));
}

export function parseAssignment(el: Element, pageUrl: string): Assignment {
  const f = fields(el);
  const dueEl = find(f, 'fecha de entrega');
  const dueAttr = el.querySelector('[due_date]')?.getAttribute('due_date');
  const dueText = clean(dueEl?.textContent);
  const dueAt = parseAnsiCR(dueAttr) ?? parseDmyCR(dueText);

  const dataFile = el.querySelector('[id^="data_file_"]');
  const submissionText = clean(dataFile?.textContent);
  const submitted = !!dataFile && !!submissionText && !/no hay entregas/i.test(submissionText);

  const [grade, outOf] = fraction(find(f, 'nota obtenida')?.textContent);
  const weightedEl = el.querySelector('.head_subaccord .gradeW');

  const desc = decodeDescription(find(f, 'descripcion'), pageUrl);

  const dropzone = el.querySelector('.container_dropzone');
  return {
    id: el.getAttribute('assign_id') ?? '',
    name: clean(el.querySelector('.assignNameText')?.textContent),
    dueAt,
    dueText: dueAt ? dueText : dueText || 'Fecha no definida',
    lateAllowed: dropzone?.getAttribute('late_submit') === 't' || yesChecked(find(f, 'posibilidad de entregar')),
    canSubmit: !!el.querySelector('.btn_send_answer, .container_dropzone'),
    submitted,
    submissionText: submitted ? submissionText : '',
    submissionLinks: submitted ? links(dataFile, pageUrl) : [],
    grade,
    outOf,
    weighted: weightedEl ? num(weightedEl.textContent) : null,
    description: /^no hay descripcion/i.test(norm(desc.text)) ? '' : desc.text,
    links: dedupe([...desc.links, ...links(el.querySelector('.content_delivery .col-md-6'), pageUrl)]),
    value: clean(find(f, 'valor de la asignacion')?.textContent),
    groupSize: clean(find(f, 'cantidad de personas')?.textContent),
  };
}

function dedupe(ls: Link[]): Link[] {
  const seen = new Set<string>();
  return ls.filter((l) => !seen.has(l.href) && seen.add(l.href));
}

export type Status = 'graded' | 'submitted' | 'pending' | 'late' | 'missed' | 'offline' | 'nodate';

/**
 * El widget de entrega sigue visible en asignaciones vencidas, así que "tiene
 * dropzone" no significa "pendiente". Esto decide el estado real.
 */
export function statusOf(a: Assignment, now: number): Status {
  if (a.grade != null) return 'graded';
  if (a.submitted) return 'submitted';
  if (!a.canSubmit) return 'offline';
  if (a.dueAt == null) return 'nodate';
  if (a.dueAt > now) return 'pending';
  return a.lateAllowed ? 'late' : 'missed';
}

export const STATUS_LABEL: Record<Status, string> = {
  graded: 'Calificada',
  submitted: 'Entregada',
  pending: 'Pendiente',
  late: 'Vencida, acepta tardías',
  missed: 'Vencida',
  offline: 'Sin entrega digital',
  nodate: 'Sin fecha',
};
