import type { Change } from '../changes';
import * as store from './store';

// Novedades detectadas al actualizar datos (notas, asignaciones, archivos).
// Viven en IndexedDB hasta que las marcás como vistas.

const KEY = 'changes';
const MAX = 60;
const MAX_AGE = 30 * 24 * 3600_000;

export const changes = $state<{ list: Change[] }>({ list: [] });

let loaded: Promise<void> | null = null;
export function loadChanges(): Promise<void> {
  loaded ??= store.get<Change[]>(KEY).then((e) => {
    const now = Date.now();
    const fromDisk = (e?.v ?? []).filter((c) => now - c.at < MAX_AGE);
    // Puede que ya se hayan agregado novedades antes de terminar de leer el disco.
    changes.list = merge(fromDisk, changes.list);
  });
  return loaded;
}

function merge(a: Change[], b: Change[]): Change[] {
  const byId = new Map<string, Change>();
  for (const c of [...a, ...b]) byId.set(c.id, c);
  return [...byId.values()].sort((x, y) => y.at - x.at).slice(0, MAX);
}

const persist = () => store.set(KEY, $state.snapshot(changes.list));

export async function addChanges(list: Change[]): Promise<void> {
  if (!list.length) return;
  await loadChanges();
  changes.list = merge(changes.list, list);
  await persist();
}

export async function dismissCourse(courseId: string): Promise<void> {
  changes.list = changes.list.filter((c) => c.courseId !== courseId);
  await persist();
}

export async function dismissAll(): Promise<void> {
  changes.list = [];
  await persist();
}

export const changesFor = (courseId: string) => changes.list.filter((c) => c.courseId === courseId);
