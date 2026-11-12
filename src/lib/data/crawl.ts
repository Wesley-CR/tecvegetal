import type { Course } from '../types';
import { folderRes, rootFolderRes } from './api';
import { session } from './resource.svelte';

// Recorre en segundo plano las carpetas de Documentos de los cursos actuales
// para que Ctrl+K encuentre cualquier archivo, no solo los de carpetas abiertas.
// Es lento a propósito: un pedido cada 2.5 s como mucho (el tope global es 60
// por minuto) y solo carpetas que no se revisaron en las últimas 6 horas.

const GAP_MS = 2500;
const FRESH_MS = 6 * 3600_000;
const MAX_FETCHES = 60;

let running = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function crawlDocs(courses: Course[]): Promise<void> {
  if (running) return;
  running = true;
  let fetches = 0;
  try {
    for (const c of courses) {
      const root = rootFolderRes(c);
      await root.load();
      if (!root.data) continue;
      const queue: string[] = [root.data];
      const seen = new Set<string>();
      while (queue.length && fetches < MAX_FETCHES) {
        if (session.expired || session.down || document.hidden) return;
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const r = folderRes(c, id);
        await r.hydrate();
        const fresh = r.data && r.updatedAt && Date.now() - r.updatedAt < FRESH_MS;
        if (!fresh) {
          await r.load({ force: true });
          fetches++;
          await sleep(GAP_MS);
        }
        for (const it of r.data?.items ?? []) if (it.kind === 'folder' && it.count !== 0) queue.push(it.id);
      }
    }
  } finally {
    running = false;
  }
}
