import { fmtWhen } from './dates';
import type { Course, EvalsData, Folder } from './types';

export type ChangeKind = 'grade' | 'regrade' | 'assignment' | 'due' | 'file';

export interface Change {
  /** Estable: el mismo cambio detectado dos veces no se duplica. */
  id: string;
  kind: ChangeKind;
  courseId: string;
  title: string;
  detail: string;
  at: number;
}

const gradeText = (g: number | null, of: number | null) => (g == null ? '' : of ? `${g} / ${of}` : String(g));

/** Qué cambió en Evaluaciones entre la versión guardada y la nueva. */
export function diffEvals(course: Course, prev: EvalsData, next: EvalsData, now = Date.now()): Change[] {
  const old = new Map(prev.categories.flatMap((c) => c.assignments.map((a) => [a.id, a] as const)));
  if (!old.size && next.categories.every((c) => !c.assignments.length)) return [];
  const out: Change[] = [];
  for (const cat of next.categories) {
    for (const a of cat.assignments) {
      if (!a.id) continue;
      const o = old.get(a.id);
      const base = { courseId: course.id, at: now };
      if (!o) {
        out.push({ ...base, id: `new:${course.id}:${a.id}`, kind: 'assignment', title: a.name, detail: a.dueAt ? `Nueva asignación, entrega ${fmtWhen(a.dueAt, now)}` : 'Nueva asignación' });
        continue;
      }
      if (o.grade == null && a.grade != null) {
        out.push({ ...base, id: `grade:${course.id}:${a.id}:${a.grade}`, kind: 'grade', title: a.name, detail: `Te calificaron: ${gradeText(a.grade, a.outOf)}` });
      } else if (o.grade != null && a.grade != null && o.grade !== a.grade) {
        out.push({ ...base, id: `grade:${course.id}:${a.id}:${a.grade}`, kind: 'regrade', title: a.name, detail: `Cambió la nota: ${gradeText(o.grade, o.outOf)} → ${gradeText(a.grade, a.outOf)}` });
      }
      if (a.dueAt != null && o.dueAt !== a.dueAt && a.grade == null) {
        out.push({ ...base, id: `due:${course.id}:${a.id}:${a.dueAt}`, kind: 'due', title: a.name, detail: o.dueAt == null ? `Ahora tiene fecha: ${fmtWhen(a.dueAt, now)}` : `Cambió la fecha: ahora ${fmtWhen(a.dueAt, now)}` });
      }
    }
  }
  return out;
}

/** Archivos nuevos en una carpeta. */
export function diffFolder(course: Course, prev: Folder, next: Folder, now = Date.now()): Change[] {
  const old = new Set(prev.items.map((i) => i.id));
  const where = next.path.length ? next.path.join(' › ') : 'Documentos';
  return next.items
    .filter((i) => i.kind !== 'folder' && !old.has(i.id))
    .map((i) => ({ id: `file:${course.id}:${i.id}`, kind: 'file' as const, courseId: course.id, title: i.name, detail: `Archivo nuevo en ${where}`, at: now }));
}
