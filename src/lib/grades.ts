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
export function evaluatedWeight(cat: Category): number {
  const w = cat.weight ?? 0;
  if (!w) return 0;
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
