import type { Category, EvalsData } from './types';

/** Nota mínima para pasar un curso en el TEC (lo que ya cuenta como 70 al redondear). */
export const PASS = 67.6;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Cuántos puntos del rubro ya se evaluaron. El sitio no lo dice: solo da el
 * subtotal ganado. Se deduce del promedio de las notas calificadas:
 * si en Exámenes (25) llevás 11.9 y la única nota es 95.2/100, entonces ya se
 * evaluaron 11.9 / 0.952 = 12.5 puntos de esos 25.
 */
/**
 * Lo que vale cada asignación del rubro, si se puede saber con certeza. Muchos
 * profes ponen el valor como el "de cuánto" (I parcial: 16.49 / 23, III parcial
 * -- / 27) o todas sobre 100 y pesan igual. Se reparte el peso del rubro en
 * proporción a eso y solo se acepta si cuadra con el subtotal que da el TEC.
 */
export function itemWorths(cat: Category): Map<string, number> | null {
  const w = cat.weight ?? 0;
  const items = cat.assignments;
  if (!w || !items.length) return null;
  // Lo más confiable: el TEC dice cuánto vale cada una en el encabezado.
  if (items.every((a) => a.worth && a.worth > 0)) {
    const sum = items.reduce((s, a) => s + a.worth!, 0);
    if (Math.abs(sum - w) <= Math.max(0.5, w * 0.02)) return new Map(items.map((a) => [a.id, (a.worth! * w) / sum]));
  }
  if (items.some((a) => !a.outOf || a.outOf <= 0)) return null;
  const total = items.reduce((s, a) => s + a.outOf!, 0);
  const worths = new Map(items.map((a) => [a.id, (w * a.outOf!) / total]));
  const graded = items.filter((a) => a.grade != null);
  if (!graded.length) return cat.earned ? null : worths;
  const predicted = graded.reduce((s, a) => s + worths.get(a.id)! * (a.grade! / a.outOf!), 0);
  const earned = cat.earned ?? 0;
  // El TEC redondea (o trunca) el subtotal, así que se deja un margen chico.
  return Math.abs(predicted - earned) <= Math.max(0.2, w * 0.01) ? worths : null;
}

export function evaluatedWeight(cat: Category): number {
  const w = cat.weight ?? 0;
  if (!w) return 0;
  const exact = itemWorths(cat);
  if (exact) return cat.assignments.filter((a) => a.grade != null).reduce((s, a) => s + exact.get(a.id)!, 0);
  const graded = cat.assignments.filter((a) => a.grade != null && a.outOf);
  const earned = cat.earned ?? 0;
  if (!graded.length) {
    // Hay puntos ganados pero ninguna nota visible: lo más prudente es asumir
    // que se evaluó al menos lo ganado.
    return Math.min(w, earned);
  }
  const fractions = graded.map((a) => a.grade! / a.outOf!);
  const avg = fractions.reduce((s, f) => s + f, 0) / fractions.length;
  let used: number;
  if (avg > 0.001 && earned > 0) used = earned / avg;
  else if (cat.assignments.length) used = (w * graded.length) / cat.assignments.length;
  else used = earned;
  return Math.max(earned, Math.min(w, used));
}

export type Outlook = 'passed' | 'possible' | 'impossible' | 'done' | 'unknown';

export interface Projection {
  /** Puntos ganados hasta ahora (de 100). */
  earned: number;
  /** Puntos que ya se evaluaron (lo ganado sale de acá). */
  evaluated: number;
  /** Puntos que todavía no se evalúan. */
  remaining: number;
  /** Nota máxima posible si sacás 100 en todo lo que falta. */
  max: number;
  /** Puntos que faltan para PASS (0 si ya pasaste). */
  needed: number;
  /** Promedio que necesitás en lo que falta, en % (null si no aplica). */
  neededPct: number | null;
  outlook: Outlook;
}

export function project(data: EvalsData, pass = PASS): Projection {
  const cats = data.categories.filter((c) => c.weight);
  const totalWeight = cats.reduce((s, c) => s + (c.weight ?? 0), 0);
  const earned = data.total ?? cats.reduce((s, c) => s + (c.earned ?? 0), 0);
  const evaluated = cats.reduce((s, c) => s + evaluatedWeight(c), 0);
  const remaining = Math.max(0, totalWeight - evaluated);
  const needed = Math.max(0, pass - earned);
  const base = { earned: round1(earned), evaluated: round1(evaluated), remaining: round1(remaining), max: round1(earned + remaining), needed: round1(needed) };

  if (!totalWeight) return { ...base, neededPct: null, outlook: 'unknown' };
  if (earned >= pass) return { ...base, neededPct: null, outlook: 'passed' };
  if (remaining < 0.05) return { ...base, neededPct: null, outlook: 'done' };
  const pct = (needed / remaining) * 100;
  if (pct > 100) return { ...base, neededPct: Math.round(pct), outlook: 'impossible' };
  return { ...base, neededPct: Math.ceil(pct), outlook: 'possible' };
}

/** Nota final si sacás `pct`% en todo lo que falta. */
export function finalIf(p: Projection, pct: number): number {
  return round1(p.earned + (p.remaining * pct) / 100);
}

export interface Pending {
  /** id de la asignación, o `rest:<rubro>` si el rubro tiene peso sin asignaciones publicadas. */
  key: string;
  name: string;
  category: string;
  /** Puntos (de 100) que vale, estimado. */
  worth: number;
  /** true si es "lo que falta publicar" de un rubro, no una asignación. */
  rest: boolean;
  /** true si el valor sale exacto de los "de cuánto"; false si es estimado. */
  exact?: boolean;
}

const valueNum = (v: string) => {
  const m = /(\d+(?:[.,]\d+)?)/.exec(v);
  return m ? Number(m[1].replace(',', '.')) : NaN;
};

/**
 * Lo que falta evaluar, asignación por asignación. El peso que le queda a cada
 * rubro se reparte entre sus asignaciones sin nota: en partes iguales, o
 * proporcional a su "Valor" si todas lo traen. Si el rubro tiene peso pero no
 * hay asignaciones sin nota, queda un renglón "Resto de <rubro>".
 */
export function pendingItems(data: EvalsData): Pending[] {
  const out: Pending[] = [];
  for (const cat of data.categories) {
    const left = (cat.weight ?? 0) - evaluatedWeight(cat);
    if (left < 0.05) continue;
    const open = cat.assignments.filter((a) => a.grade == null);
    const exact = itemWorths(cat);
    if (exact && open.length) {
      for (const a of open) out.push({ key: a.id, name: a.name, category: cat.name, worth: exact.get(a.id)!, rest: false, exact: true });
      continue;
    }
    if (!open.length) {
      out.push({ key: `rest:${cat.id}`, name: `Resto de ${cat.name}`, category: cat.name, worth: left, rest: true });
      continue;
    }
    const vals = open.map((a) => valueNum(a.value));
    const useVals = vals.every((v) => v > 0);
    const sum = useVals ? vals.reduce((s, v) => s + v, 0) : open.length;
    open.forEach((a, i) => out.push({ key: a.id, name: a.name, category: cat.name, worth: (left * (useVals ? vals[i] : 1)) / sum, rest: false }));
  }
  return out;
}

export type Simulation =
  | { kind: 'final'; final: number }
  | { kind: 'need'; pct: number; final: number }
  | { kind: 'safe'; final: number }
  | { kind: 'short'; max: number };

/**
 * Con las notas que pusiste (en %, por `key`): si llenaste todo, la nota final;
 * si dejaste vacías, cuánto necesitás promediar en esas para llegar a `pass`.
 */
export function simulate(earned: number, items: Pending[], scores: Record<string, number | undefined>, pass = PASS): Simulation {
  let fixed = earned;
  let open = 0;
  for (const it of items) {
    const s = scores[it.key];
    if (s == null || Number.isNaN(s)) open += it.worth;
    else fixed += (it.worth * Math.max(0, Math.min(100, s))) / 100;
  }
  if (open < 0.05) return { kind: 'final', final: round1(fixed) };
  if (fixed >= pass) return { kind: 'safe', final: round1(fixed) };
  const pct = ((pass - fixed) / open) * 100;
  if (pct > 100) return { kind: 'short', max: round1(fixed + open) };
  return { kind: 'need', pct: Math.ceil(pct), final: round1(fixed + (open * Math.ceil(pct)) / 100) };
}
