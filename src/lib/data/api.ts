import { MIN, HOUR, DAY } from '../dates';
import { parseCourses } from '../parse/courses';
import { parseFolder, parseRootFolderId } from '../parse/docs';
import { parseEvals } from '../parse/evals';
import { parsePortal } from '../parse/portal';
import { parseCourseHome, type CourseHome } from '../parse/coursehome';
import type { Course, CoursesData, EvalsData, Folder } from '../types';
import { getDoc, getJson, getText } from './net';
import { resource } from './resource.svelte';
import * as store from './store';

// TTLs: cuánto tiempo un dato cacheado se considera fresco antes de revalidar.
// Siempre se pinta el caché primero; el TTL solo decide si además se refetchea.
const TTL = {
  courses: 12 * HOUR,
  evals: 10 * MIN,
  folderRoot: 7 * DAY,
  folder: 15 * MIN,
  courseHome: 30 * MIN,
};

export const coursesRes = () =>
  resource<CoursesData>('courses', TTL.courses, async (p) => {
    const doc = await getDoc('/dotlrn/index', p);
    return { ...parseCourses(doc), portal: parsePortal(doc, new URL('/dotlrn/index', location.origin).href) };
  });

export const courseHomeRes = (c: Course) =>
  resource<CourseHome>(`home:${c.id}`, TTL.courseHome, async (p) => {
    const url = new URL(c.base, location.origin).href;
    return parseCourseHome(await getDoc(url, p), url);
  });

export const evalsUrl = (c: Course) => `${c.base}evaluation/tda-ce-estudiante/tda-index?page_num=3`;

export const evalsRes = (c: Course) =>
  resource<EvalsData>(`evals:${c.id}`, TTL.evals, async (p) => {
    const url = evalsUrl(c);
    return parseEvals(await getDoc(url, p), new URL(url, location.origin).href);
  });

export const rootFolderRes = (c: Course) =>
  resource<string>(`fsroot:${c.id}`, TTL.folderRoot, async (p) => {
    const id = parseRootFolderId(await getText(`${c.base}file-storage/`, p));
    if (!id) throw new Error('No se encontró la carpeta raíz de Documentos');
    return id;
  });

export const folderRes = (c: Course, folderId: string) =>
  resource<Folder>(`fs:${c.id}:${folderId}`, TTL.folder, async (p) => {
    const f = parseFolder(await getJson(`${c.base}file-storage/api/folder/${folderId}`, p), c.base);
    // La API no da IDs de los ancestros: guardamos padre→hijo para armar el camino.
    for (const it of f.items) if (it.kind === 'folder') store.set(`fsparent:${it.id}`, { id: f.id, name: f.name });
    return f;
  });

/** Ancestros de una carpeta (raíz primero), según lo navegado hasta ahora. */
export async function folderAncestors(folderId: string, rootId: string | undefined): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = [];
  let cur = folderId;
  for (let i = 0; i < 20 && cur !== rootId; i++) {
    const p = (await store.get<{ id: string; name: string }>(`fsparent:${cur}`))?.v;
    if (!p) break;
    out.unshift(p);
    cur = p.id;
  }
  return out;
}


// --- "visto por última vez", para marcar documentos nuevos desde tu última visita ---

export async function lastSeen(key: string): Promise<number | null> {
  return (await store.get<number>(`seen:${key}`))?.v ?? null;
}

export async function markSeen(key: string, t = Date.now()): Promise<void> {
  await store.set(`seen:${key}`, t, t);
}
