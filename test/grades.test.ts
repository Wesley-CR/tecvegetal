import { describe, expect, it } from 'vitest';
import { evaluatedWeight, finalIf, pendingItems, project, simulate } from '../src/lib/grades';
import type { Assignment, Category } from '../src/lib/types';

const a = (grade: number | null, outOf = 100): Assignment => ({
  id: Math.random().toString(36), name: 'x', dueAt: null, dueText: '', lateAllowed: false, canSubmit: false,
  submitted: false, submissionText: '', submissionLinks: [], grade, outOf: grade == null ? 100 : outOf, weighted: null,
  description: '', links: [], value: '', groupSize: '',
});
const cat = (weight: number, earned: number | null, grades: (number | null)[]): Category => ({
  id: String(weight), name: 'c', weight, earned, assignments: grades.map((g) => a(g)),
});

describe('calculadora de nota', () => {
  it('deduce cuánto del rubro ya se evaluó (caso real de SQA)', () => {
    // Exámenes 25%: llevás 11.9 con un 95.2 → ese examen valía 12.5.
    expect(evaluatedWeight(cat(25, 11.9, [95.2, null]))).toBeCloseTo(12.5, 1);
  });

  it('sin notas, nada evaluado', () => {
    expect(evaluatedWeight(cat(15, null, [null, null]))).toBe(0);
  });

  it('un cero cuenta como evaluado (reparte el peso entre asignaciones)', () => {
    expect(evaluatedWeight(cat(20, 0, [0, null, null, null]))).toBe(5);
  });

  it('proyección: cuánto necesitás en lo que falta', () => {
    const p = project({
      categories: [cat(25, 11.9, [95.2, null]), cat(15, null, [null]), cat(60, null, [null, null])],
      total: 11.9, totalOf: 100,
    });
    expect(p.evaluated).toBeCloseTo(12.5, 1);
    expect(p.remaining).toBeCloseTo(87.5, 1);
    expect(p.outlook).toBe('possible');
    // (67.6 - 11.9) / 87.5 = 63.7% → 64
    expect(p.neededPct).toBe(64);
    expect(finalIf(p, 100)).toBeCloseTo(99.4, 1);
  });

  it('ya pasaste', () => {
    const p = project({ categories: [cat(100, 70, [70])], total: 70, totalOf: 100 });
    expect(p.outlook).toBe('passed');
  });

  it('ya no alcanza', () => {
    const p = project({ categories: [cat(80, 20, [25]), cat(20, null, [null])], total: 20, totalOf: 100 });
    expect(p.outlook).toBe('impossible');
  });

  it('todo evaluado y no llegó', () => {
    const p = project({ categories: [cat(100, 50, [50])], total: 50, totalOf: 100 });
    expect(p.outlook).toBe('done');
  });

  it('lo que falta, asignación por asignación', () => {
    const data = { categories: [cat(25, 11.9, [95.2, null]), cat(15, null, [null, null]), { ...cat(60, null, []), id: 'p', name: 'Proyecto' }], total: 11.9, totalOf: 100 };
    const items = pendingItems(data);
    expect(items.map((i) => Math.round(i.worth * 10) / 10)).toEqual([12.5, 7.5, 7.5, 60]);
    expect(items[3]).toMatchObject({ name: 'Resto de Proyecto', rest: true });
  });

  it('simulador: vacías → cuánto necesitás en esas; todo lleno → nota final', () => {
    const items = [{ key: 'a', worth: 40 }, { key: 'b', worth: 40 }].map((x) => ({ ...x, name: '', category: '', rest: false }));
    expect(simulate(20, items, {})).toMatchObject({ kind: 'need', pct: 60 });
    expect(simulate(20, items, { a: 90 })).toMatchObject({ kind: 'need', pct: 29 });
    expect(simulate(20, items, { a: 100, b: 100 })).toEqual({ kind: 'final', final: 100 });
    expect(simulate(20, items, { a: 0 })).toMatchObject({ kind: 'short', max: 60 });
    expect(simulate(20, items, { a: 100, b: undefined })).toMatchObject({ kind: 'need', pct: 19 });
    expect(simulate(70, items, {})).toMatchObject({ kind: 'safe' });
  });
});
