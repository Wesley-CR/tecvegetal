import { describe, expect, it } from 'vitest';
import { diffEvals, diffFolder } from '../src/lib/changes';
import type { Assignment, Course, EvalsData, Folder } from '../src/lib/types';

const course: Course = { id: 'S-2-2026.SJ.IC6831.40', dept: 'CA', code: 'IC6831', period: 'S-2-2026', campus: 'SJ', group: '40', name: 'SQA', base: '/x/' };
const a = (id: string, o: Partial<Assignment> = {}): Assignment => ({
  id, name: `Tarea ${id}`, dueAt: null, dueText: '', lateAllowed: false, canSubmit: true, submitted: false,
  submissionText: '', submissionLinks: [], grade: null, outOf: 100, weighted: null, description: '', links: [], value: '', groupSize: '', ...o,
});
const evals = (...as: Assignment[]): EvalsData => ({ categories: [{ id: 'c', name: 'C', weight: 100, earned: null, assignments: as }], total: null, totalOf: 100 });

describe('novedades', () => {
  it('detecta notas nuevas, cambios de nota y asignaciones nuevas', () => {
    const prev = evals(a('1'), a('2', { grade: 80 }), a('3'));
    const next = evals(a('1', { grade: 95 }), a('2', { grade: 85 }), a('3'), a('4', { dueAt: Date.now() + 86400_000 }));
    const kinds = diffEvals(course, prev, next).map((c) => `${c.kind}:${c.title}`);
    expect(kinds).toEqual(['grade:Tarea 1', 'regrade:Tarea 2', 'assignment:Tarea 4']);
  });

  it('sin cambios no hay novedades', () => {
    const e = evals(a('1', { grade: 90 }), a('2'));
    expect(diffEvals(course, e, e)).toEqual([]);
  });

  it('cambio de fecha en algo sin calificar', () => {
    const d = new Date(2026, 10, 20).getTime();
    const out = diffEvals(course, evals(a('1', { dueAt: d })), evals(a('1', { dueAt: d + 86400_000 })));
    expect(out.map((c) => c.kind)).toEqual(['due']);
  });

  it('ids estables: el mismo cambio detectado dos veces no se duplica', () => {
    const prev = evals(a('1'));
    const next = evals(a('1', { grade: 70 }));
    expect(diffEvals(course, prev, next, 1)[0].id).toBe(diffEvals(course, prev, next, 2)[0].id);
  });

  it('archivos nuevos en una carpeta (no carpetas)', () => {
    const f = (ids: [string, 'file' | 'folder'][]): Folder => ({ id: '9', name: 'Apuntes', modified: null, path: ['Apuntes'], items: ids.map(([id, kind]) => ({ id, name: `n${id}`, kind, mime: '', count: null, modified: null, isNew: false, author: '', href: null })) });
    const out = diffFolder(course, f([['1', 'file']]), f([['1', 'file'], ['2', 'file'], ['3', 'folder']]));
    expect(out.map((c) => c.title)).toEqual(['n2']);
    expect(out[0].detail).toBe('Archivo nuevo en Apuntes');
  });
});
