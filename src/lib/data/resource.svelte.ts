import * as store from './store';
import { ServerDown, SessionExpired } from './net';

// Estado global de sesión: si cualquier request choca con el login, la UI lo muestra.
export const session = $state({ expired: false, down: false });

/**
 * Stale-while-revalidate:
 *  1. pinta lo que haya en caché al instante (aunque esté viejo),
 *  2. si pasó el TTL (o se pide `force`), refetchea en background,
 *  3. al llegar, reemplaza y persiste.
 * Varias vistas que piden la misma clave comparten la misma instancia.
 */
// Una sola señal de "algo cambió" para todos los recursos, creada al cargar el
// módulo (fuera de cualquier cálculo reactivo).
//
// Por qué no un $state por recurso: los recursos se crean de forma perezosa, y
// si el primero en pedir uno es un $derived, Svelte 5 marca el estado recién
// creado como "propio" de ese derived y no lo registra como dependencia. El
// derived nunca se enteraba de que llegaban los datos (el bug de "no salen las
// asignaciones hasta darle a actualizar"). Con una señal de módulo eso no pasa.
// Invalida a todos los lectores a la vez, pero son pocos recursos y es barato.
const rev = $state({ n: 0 });

export class Resource<T> {
  // Los datos se reemplazan enteros y nunca se mutan: viven en campos planos
  // (sin proxies reactivos profundos) y avisan por `rev`.
  #data: T | undefined = undefined;
  #updatedAt: number | undefined = undefined;
  #loading = false;
  #error: string | undefined = undefined;
  #hydrated = false;
  #inflight: Promise<void> | null = null;

  get data(): T | undefined { rev.n; return this.#data; }
  set data(v: T | undefined) { this.#data = v; rev.n++; }
  get updatedAt(): number | undefined { rev.n; return this.#updatedAt; }
  set updatedAt(v: number | undefined) { this.#updatedAt = v; rev.n++; }
  get loading(): boolean { rev.n; return this.#loading; }
  set loading(v: boolean) { if (v !== this.#loading) { this.#loading = v; rev.n++; } }
  get error(): string | undefined { rev.n; return this.#error; }
  set error(v: string | undefined) { if (v !== this.#error) { this.#error = v; rev.n++; } }

  constructor(
    readonly key: string,
    readonly ttl: number,
    private loader: (priority: boolean) => Promise<T>,
  ) {}

  get stale(): boolean {
    return this.#updatedAt == null || Date.now() - this.#updatedAt > this.ttl;
  }

  async hydrate(): Promise<void> {
    if (this.#hydrated) return;
    this.#hydrated = true;
    const e = await store.get<T>(this.key);
    if (e && this.#data === undefined) {
      this.data = e.v;
      this.updatedAt = e.t;
    }
  }

  /** Hidrata desde caché y revalida si hace falta. Devuelve cuando hay datos frescos o falla. */
  async load(opts: { force?: boolean; priority?: boolean } = {}): Promise<void> {
    await this.hydrate();
    if (!opts.force && !this.stale) return;
    if (this.#inflight) return this.#inflight;
    this.#inflight = (async () => {
      this.loading = true;
      try {
        const v = await this.loader(!!opts.priority);
        const t = Date.now();
        this.data = v;
        this.updatedAt = t;
        this.error = undefined;
        session.expired = false;
        session.down = false;
        await store.set(this.key, v, t);
      } catch (e) {
        if (e instanceof SessionExpired) session.expired = true;
        if (e instanceof ServerDown) session.down = true;
        this.error = e instanceof Error ? e.message : String(e);
      } finally {
        this.loading = false;
        this.#inflight = null;
      }
    })();
    return this.#inflight;
  }
}

const registry = new Map<string, Resource<any>>();

export function resource<T>(key: string, ttl: number, loader: (priority: boolean) => Promise<T>): Resource<T> {
  let r = registry.get(key);
  if (!r) {
    r = new Resource<T>(key, ttl, loader);
    registry.set(key, r);
  }
  return r as Resource<T>;
}

/** Fuerza revalidar todo lo que esté en memoria (botón "actualizar"). */
export function refreshAll(): Promise<void[]> {
  return Promise.all([...registry.values()].map((r) => r.load({ force: true })));
}

export function invalidate(prefix: string): void {
  for (const [k, r] of registry) if (k.startsWith(prefix)) r.load({ force: true, priority: true });
}
