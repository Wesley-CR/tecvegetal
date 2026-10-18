// Todas las requests a TEC Digital pasan por acá: cola con concurrencia baja
// (el backend es lento y no queremos martillarlo), detección de sesión vencida
// y el fetch correcto para cada navegador.

export class SessionExpired extends Error {
  constructor() { super('La sesión de TEC Digital expiró'); }
}

/** El servidor del TEC a veces se cuelga sin responder: no esperamos para siempre. */
export class ServerDown extends Error {
  constructor() { super('TEC Digital no está respondiendo. Se muestra la última copia guardada.'); }
}

const TIMEOUT_MS = 25_000;

// Freno de emergencia: nunca más de RATE_MAX requests por minuto al TEC, pase lo
// que pase arriba. Uso normal: ~10 al abrir y casi nada después (hay caché).
const RATE_MAX = 60;
const RATE_WINDOW = 60_000;
const recent: number[] = [];

export class TooManyRequests extends Error {
  constructor() { super('TEC Vegetal frenó los pedidos al TEC Digital por seguridad. Recargá en un minuto.'); }
}

function takeRateToken(): void {
  const now = Date.now();
  while (recent.length && now - recent[0] > RATE_WINDOW) recent.shift();
  if (recent.length >= RATE_MAX) throw new TooManyRequests();
  recent.push(now);
}

// En Firefox el `fetch` global del content script corre con el principal de la
// extensión; `content.fetch` corre como la página y manda las cookies de sesión.
const pageFetch: typeof fetch = (() => {
  const c = (globalThis as any).content;
  return c && typeof c.fetch === 'function' ? c.fetch.bind(c) : fetch.bind(globalThis);
})();

const MAX = 3;
let active = 0;
const waiting: (() => void)[] = [];

async function slot<T>(fn: () => Promise<T>, priority = false): Promise<T> {
  if (active >= MAX) await new Promise<void>((r) => (priority ? waiting.unshift(r) : waiting.push(r)));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

const isLogin = (url: string) => {
  try { return /^\/register\b/.test(new URL(url, location.href).pathname); } catch { return false; }
};

async function raw(url: string, priority: boolean): Promise<string> {
  return slot(async () => {
    takeRateToken();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await pageFetch(url, { credentials: 'include', redirect: 'follow', signal: ctrl.signal });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw new ServerDown();
      throw new ServerDown();
    } finally {
      clearTimeout(timer);
    }
    if (isLogin(res.url)) throw new SessionExpired();
    if (res.status >= 500) throw new ServerDown();
    if (!res.ok) throw new Error(`TEC Digital respondió ${res.status} en ${new URL(url, location.href).pathname}`);
    return res.text();
  }, priority);
}

export async function getText(url: string, priority = false): Promise<string> {
  return raw(url, priority);
}

export async function getDoc(url: string, priority = false): Promise<Document> {
  const text = await raw(url, priority);
  const doc = new DOMParser().parseFromString(text, 'text/html');
  if (doc.querySelector('form[action*="register"], input[type=password]') && /Iniciar Sesi[oó]n/i.test(doc.title + doc.body?.textContent)) {
    throw new SessionExpired();
  }
  return doc;
}

export async function getJson<T = unknown>(url: string, priority = false): Promise<T> {
  const text = await raw(url, priority);
  if (/^\s*</.test(text)) {
    if (/Iniciar Sesi[oó]n/i.test(text)) throw new SessionExpired();
    throw new Error('Se esperaba JSON y llegó HTML');
  }
  return JSON.parse(text) as T;
}
