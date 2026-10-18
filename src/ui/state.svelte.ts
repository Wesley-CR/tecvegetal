import { coursesRes, evalsRes } from '../lib/data/api';
import { statusOf, type Status } from '../lib/parse/evals';
import { courseFromPath } from '../lib/parse/courses';
import type { Assignment, Course } from '../lib/types';

export const courses = coursesRes();

export interface CourseRef { course: Course; index: number; current: boolean }

/** Busca un curso por id; si el inicio aún no cargó, lo arma desde la URL. */
export function findCourse(id: string, base?: string): CourseRef | null {
  const d = courses.data;
  if (d) {
    const i = d.current.findIndex((c) => c.id === id);
    if (i >= 0) return { course: d.current[i], index: i, current: true };
    for (const g of d.past) {
      const c = g.courses.find((x) => x.id === id);
      if (c) return { course: c, index: -1, current: false };
    }
  }
  const c = base ? courseFromPath(base) : null;
  return c ? { course: c, index: -1, current: false } : null;
}

export interface Item { a: Assignment; course: Course; index: number; category: string; status: Status }

/** Asignaciones de los cursos actuales que ya están en caché/cargadas. */
export function currentItems(now: number): Item[] {
  const out: Item[] = [];
  (courses.data?.current ?? []).forEach((course, index) => {
    const e = evalsRes(course).data;
    if (!e) return;
    for (const cat of e.categories)
      for (const a of cat.assignments) out.push({ a, course, index, category: cat.name, status: statusOf(a, now) });
  });
  return out;
}

export const byDue = (x: Item, y: Item) => (x.a.dueAt ?? Infinity) - (y.a.dueAt ?? Infinity);
