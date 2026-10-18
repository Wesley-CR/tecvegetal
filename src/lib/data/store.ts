// Key-value persistente sobre IndexedDB (origen de tecdigital.tec.ac.cr: el
// content script comparte origen con la página). Mantiene un espejo en memoria
// para que las lecturas repetidas no toquen IDB. Si IDB no está disponible
// (modo privado de Firefox, etc.), cae a solo-memoria sin romper nada.

export interface Entry<T> { v: T; t: number }

const DB = 'tecvegetal';
const STORE = 'kv';
// Subir VERSION cuando cambie la forma de algún dato cacheado: al abrir, se
// descarta todo lo viejo en vez de pintar datos con campos que faltan.
const VERSION = 2;
const mem = new Map<string, Entry<unknown>>();
let dbp: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (d.objectStoreNames.contains(STORE)) d.deleteObjectStore(STORE);
        d.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

export async function get<T>(key: string): Promise<Entry<T> | undefined> {
  if (mem.has(key)) return mem.get(key) as Entry<T>;
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => {
        const e = req.result as Entry<T> | undefined;
        if (e) mem.set(key, e);
        resolve(e);
      };
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function set<T>(key: string, v: T, t = Date.now()): Promise<void> {
  const e: Entry<T> = { v, t };
  mem.set(key, e);
  const d = await db();
  if (!d) return;
  try {
    d.transaction(STORE, 'readwrite').objectStore(STORE).put(e, key);
  } catch {
    /* cuota llena o DB cerrada: la memoria sigue sirviendo */
  }
}

/** Lee varias claves con un prefijo (para la búsqueda global sobre lo cacheado). */
export async function entries<T>(prefix: string): Promise<[string, Entry<T>][]> {
  const d = await db();
  if (!d) return [...mem].filter(([k]) => k.startsWith(prefix)) as [string, Entry<T>][];
  return new Promise((resolve) => {
    const out: [string, Entry<T>][] = [];
    try {
      // Tope U+FFFD: U+FFFF es un "no-carácter" y Chrome rechaza scripts que lo traen.
      const range = IDBKeyRange.bound(prefix, prefix + '\ufffd');
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).openCursor(range);
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve(out);
        out.push([String(c.key), c.value]);
        c.continue();
      };
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

export async function clearAll(): Promise<void> {
  mem.clear();
  const d = await db();
  if (!d) return;
  try { d.transaction(STORE, 'readwrite').objectStore(STORE).clear(); } catch { /* nada */ }
}
