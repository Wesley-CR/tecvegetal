import * as store from './data/store';
import { dominantTint, type Tint } from './tint';

// Fondo de pantalla personalizado: link de Wallhaven, link directo o imagen subida.
// - La configuración va en localStorage (se aplica antes de montar la app).
// - Cada fondo usado queda en un historial (IndexedDB) con su miniatura y, si se
//   pudo, la imagen misma en caché: volver a uno es instantáneo y no se baja otra vez.

export type BlurMode = 'none' | 'image' | 'glass';

export interface BgSettings {
  /** id del fondo actual en el historial; null = sin fondo. */
  current: string | null;
  /** Qué tanto se ve la imagen sobre el color del tema, 0–100. */
  opacity: number;
  /** Intensidad del desenfoque en px. */
  blur: number;
  mode: BlurMode;
  /** Opacidad de paneles y tarjetas, 0–100. */
  panels: number;
  /** Tono de la interfaz; null = el azul original. */
  tint: Tint | null;
}

export interface BgItem {
  id: string;
  /** Link original (null si fue una subida). */
  url: string | null;
  /** Miniatura chica (data: JPEG) para el historial. */
  thumb: string;
  /** Si la imagen completa está guardada en caché. */
  cached: boolean;
  at: number;
}

const KEY = 'tecvegetal:bg';
const HISTORY_KEY = 'bg:history';
const imgKey = (id: string) => `bg:img:${id}`;
const MAX_HISTORY = 10;

export const DEFAULTS: BgSettings = { current: null, opacity: 70, blur: 12, mode: 'glass', panels: 72, tint: null };

function read(): BgSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && typeof v === 'object') {
      const out = { ...DEFAULTS, ...v };
      // 1.2.0 guardaba el link en `src`: se migra al historial al cargar.
      if (typeof v.src === 'string' && v.src !== 'local' && !v.current) pendingMigration = v.src;
      delete (out as { src?: unknown }).src;
      return out;
    }
  } catch { /* nada */ }
  return { ...DEFAULTS };
}

let pendingMigration: string | null = null;
export const bg = $state<BgSettings>(read());
/** URL que realmente se muestra (data: si está en caché). */
export const bgView = $state<{ url: string | null; error: string | null }>({ url: null, error: null });
export const history = $state<{ list: BgItem[] }>({ list: [] });

export function saveBg(): void {
  try { localStorage.setItem(KEY, JSON.stringify($state.snapshot(bg))); } catch { /* nada */ }
  applyBg();
}

let layer: HTMLImageElement | null = null;
/** Imagen resuelta para `bg.current` (de caché o el link). */
let resolved: { id: string; url: string } | null = null;
let historyLoaded: Promise<void> | null = null;

export function loadHistory(): Promise<void> {
  historyLoaded ??= store.get<BgItem[]>(HISTORY_KEY).then(async (e) => {
    history.list = e?.v ?? [];
    if (pendingMigration) {
      const url = pendingMigration;
      pendingMigration = null;
      await setBgFromUrl(url);
    }
  });
  return historyLoaded;
}

async function persistHistory() {
  await store.set(HISTORY_KEY, $state.snapshot(history.list));
}

/** Aplica tono y fondo al documento. Se puede llamar las veces que sea. */
export function applyBg(): void {
  if (pendingMigration) void loadHistory();
  const html = document.documentElement;
  if (bg.tint) {
    html.setAttribute('data-tint', '');
    html.style.setProperty('--tint-h', String(bg.tint.h));
    html.style.setProperty('--tint-c', String(bg.tint.c));
  } else {
    html.removeAttribute('data-tint');
  }

  const id = bg.current;
  if (id && resolved?.id !== id) {
    void resolve(id);
    return; // se vuelve a llamar cuando la imagen esté lista
  }
  const url = id ? resolved?.url ?? null : null;
  bgView.url = url;
  if (!url) {
    html.removeAttribute('data-bg');
    layer?.remove();
    layer = null;
    return;
  }
  html.setAttribute('data-bg', bg.mode);
  html.style.setProperty('--bg-opacity', String(bg.opacity / 100));
  html.style.setProperty('--bg-blur', `${bg.blur}px`);
  html.style.setProperty('--panel-a', `${bg.panels}%`);
  if (!layer || !layer.isConnected) {
    layer = document.createElement('img');
    layer.id = 'tv-bg';
    layer.alt = '';
    layer.decoding = 'async';
    // Wallhaven y otros sitios a veces bloquean imágenes con Referer de otro dominio.
    layer.referrerPolicy = 'no-referrer';
    layer.addEventListener('error', () => { if (layer?.getAttribute('src')) bgView.error = 'No se pudo cargar la imagen.'; });
    layer.addEventListener('load', () => { bgView.error = null; });
    document.body.prepend(layer);
  }
  if (layer.getAttribute('src') !== url) layer.src = url;
}

async function resolve(id: string): Promise<void> {
  const cached = await store.get<string>(imgKey(id));
  let url = cached?.v ?? null;
  if (!url) {
    await loadHistory();
    url = history.list.find((h) => h.id === id)?.url ?? null;
  }
  if (bg.current !== id) return;
  if (!url) { bg.current = null; saveBg(); return; }
  resolved = { id, url };
  applyBg();
}

/** Pone un fondo del historial. */
export function useBg(id: string): void {
  bg.current = id;
  bgView.error = null;
  saveBg();
  // Al frente del historial.
  const it = history.list.find((h) => h.id === id);
  if (it) {
    history.list = [{ ...it, at: Date.now() }, ...history.list.filter((h) => h.id !== id)];
    void persistHistory();
  }
}

export function clearBg(): void {
  bg.current = null;
  bgView.error = null;
  saveBg();
}

export async function removeFromHistory(id: string): Promise<void> {
  history.list = history.list.filter((h) => h.id !== id);
  await store.set(imgKey(id), null);
  await persistHistory();
  if (bg.current === id) clearBg();
}

async function addToHistory(item: Omit<BgItem, 'at'>, image: string | null): Promise<void> {
  await loadHistory();
  if (image) await store.set(imgKey(item.id), image);
  const rest = history.list.filter((h) => h.id !== item.id);
  const dropped = rest.slice(MAX_HISTORY - 1);
  history.list = [{ ...item, at: Date.now() }, ...rest.slice(0, MAX_HISTORY - 1)];
  for (const d of dropped) await store.set(imgKey(d.id), null);
  await persistHistory();
  resolved = { id: item.id, url: image ?? item.url! };
  useBg(item.id);
}

/**
 * Links de Wallhaven a la imagen completa. La página (wallhaven.cc/w/abc123)
 * no dice la extensión, así que se prueban jpg y png.
 */
export function wallhavenCandidates(input: string): string[] | null {
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  let id: string | null = null;
  if (host === 'wallhaven.cc') id = /^\/w\/([a-z0-9]+)/i.exec(u.pathname)?.[1] ?? null;
  else if (host === 'whvn.cc') id = /^\/([a-z0-9]+)/i.exec(u.pathname)?.[1] ?? null;
  else if (host === 'th.wallhaven.cc') id = /\/([a-z0-9]+)\.(?:jpg|png)$/i.exec(u.pathname)?.[1] ?? null;
  else if (host === 'w.wallhaven.cc') return [u.href];
  if (!id) return null;
  const id_ = id.toLowerCase();
  return ['jpg', 'png'].map((ext) => `https://w.wallhaven.cc/full/${id_.slice(0, 2)}/wallhaven-${id_}.${ext}`);
}

function loadImage(url: string, cors = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    const done = (ok: boolean) => { clearTimeout(t); resolve(ok && img.naturalWidth > 0 ? img : null); };
    const t = setTimeout(() => done(false), 20000);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

function toJpeg(img: HTMLImageElement, maxSide: number, quality: number): string | null {
  try {
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return null; // canvas "contaminado" (el sitio no permite leer la imagen)
  }
}

const thumbOf = (img: HTMLImageElement) => toJpeg(img, 320, 0.75) ?? '';
const idFor = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

/** Pide la imagen al background (Wallhaven) para guardarla en caché. */
async function fetchViaBackground(url: string): Promise<string | null> {
  try {
    const r = (await browser.runtime.sendMessage({ type: 'tv:fetch-image', url })) as { data?: string } | undefined;
    return r?.data ?? null;
  } catch {
    return null;
  }
}

/** Usa un link (de Wallhaven o directo a una imagen). Devuelve un error legible o null. */
export async function setBgFromUrl(input: string): Promise<string | null> {
  const raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) return 'Pegá un link que empiece con https://';
  const wh = wallhavenCandidates(raw);
  for (const url of wh ?? [raw]) {
    // Wallhaven: se baja por el background y queda en caché.
    if (wh) {
      const data = await fetchViaBackground(url);
      if (data) {
        const img = await loadImage(data);
        if (img) { await addToHistory({ id: idFor(url), url, thumb: thumbOf(img), cached: true }, data); return null; }
      }
    }
    // Otros sitios: si permiten leer la imagen (CORS) se guarda; si no, se usa el link
    // tal cual y el navegador la guarda en su caché normal.
    const corsImg = await loadImage(url, true);
    const data = corsImg ? toJpeg(corsImg, 2560, 0.88) : null;
    if (corsImg && data) { await addToHistory({ id: idFor(url), url, thumb: thumbOf(corsImg), cached: true }, data); return null; }
    const img = corsImg ?? (await loadImage(url));
    if (img) { await addToHistory({ id: idFor(url), url, thumb: thumbOf(img), cached: false }, null); return null; }
  }
  return wh
    ? 'No se pudo bajar ese wallpaper de Wallhaven.'
    : 'No se pudo cargar. Tiene que ser un link directo a la imagen (termina en .jpg, .png…) o de Wallhaven.';
}

/** Usa una imagen del compu. Se achica a 2560 px como mucho para no llenar el almacenamiento. */
export async function setBgFromFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return 'Ese archivo no es una imagen.';
  const src = await new Promise<string | null>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
  if (!src) return 'No se pudo leer el archivo.';
  const img = await loadImage(src);
  if (!img) return 'No se pudo abrir esa imagen.';
  const big = Math.max(img.naturalWidth, img.naturalHeight) > 2560 || file.size > 1_500_000;
  const data = big ? toJpeg(img, 2560, 0.88) ?? src : src;
  await addToHistory({ id: idFor(`${file.name}:${file.size}:${file.lastModified}`), url: null, thumb: thumbOf(img), cached: true }, data);
  return null;
}

/**
 * Saca el tono dominante del fondo actual. Funciona con lo que está en caché;
 * con un link sin caché, solo si el sitio permite leer la imagen.
 */
export async function tintFromImage(): Promise<Tint | null> {
  const url = bgView.url;
  if (!url) return null;
  const img = await loadImage(url, !url.startsWith('data:'));
  if (!img) return null;
  try {
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 27;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return dominantTint(ctx.getImageData(0, 0, c.width, c.height).data);
  } catch {
    return null;
  }
}
