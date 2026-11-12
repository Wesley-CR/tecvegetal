import * as store from './data/store';

// Fondo de pantalla personalizado: un link (directo o de Wallhaven) o una imagen
// subida. La configuración va en localStorage (para aplicarla antes de montar);
// la imagen subida, en IndexedDB porque puede pesar varios cientos de KB.

export type BlurMode = 'none' | 'image' | 'glass';

export interface BgSettings {
  /** Link de la imagen, o 'local' si es una subida. null = sin fondo. */
  src: string | null;
  /** Qué tanto se ve la imagen sobre el color del tema, 0–100. */
  opacity: number;
  /** Intensidad del desenfoque en px. */
  blur: number;
  mode: BlurMode;
  /** Opacidad de paneles y tarjetas, 0–100. */
  panels: number;
}

const KEY = 'tecvegetal:bg';
const IMG_KEY = 'bg:image';
export const DEFAULTS: BgSettings = { src: null, opacity: 70, blur: 12, mode: 'glass', panels: 72 };

function read(): BgSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && typeof v === 'object') return { ...DEFAULTS, ...v };
  } catch { /* nada */ }
  return { ...DEFAULTS };
}

export const bg = $state<BgSettings>(read());
/** URL que realmente se muestra (data: para las subidas). */
export const bgView = $state<{ url: string | null; error: string | null }>({ url: null, error: null });

export function saveBg(): void {
  try { localStorage.setItem(KEY, JSON.stringify($state.snapshot(bg))); } catch { /* nada */ }
  applyBg();
}

let layer: HTMLImageElement | null = null;
let localUrl: string | null = null;

/** Aplica el fondo al documento. Se puede llamar las veces que sea. */
export function applyBg(): void {
  const html = document.documentElement;
  const url = bg.src === 'local' ? localUrl : bg.src;
  bgView.url = url;
  if (!url) {
    html.removeAttribute('data-bg');
    layer?.remove();
    layer = null;
    if (bg.src === 'local' && !localUrl) void loadLocal();
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

async function loadLocal(): Promise<void> {
  const e = await store.get<string>(IMG_KEY);
  if (e?.v && bg.src === 'local') {
    localUrl = e.v;
    applyBg();
  }
}

export function clearBg(): void {
  bg.src = null;
  localUrl = null;
  bgView.error = null;
  void store.set(IMG_KEY, null);
  saveBg();
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

function probe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    const done = (ok: boolean) => { clearTimeout(t); resolve(ok); };
    const t = setTimeout(() => done(false), 15000);
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/** Usa un link (de Wallhaven o directo a una imagen). Devuelve un error legible o null. */
export async function setBgFromUrl(input: string): Promise<string | null> {
  const raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) return 'Pegá un link que empiece con https://';
  const candidates = wallhavenCandidates(raw) ?? [raw];
  for (const url of candidates) {
    if (await probe(url)) {
      bg.src = url;
      localUrl = null;
      void store.set(IMG_KEY, null);
      saveBg();
      return null;
    }
  }
  return wallhavenCandidates(raw)
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
  const img = new Image();
  const ok = await new Promise<boolean>((resolve) => { img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = src; });
  if (!ok) return 'No se pudo abrir esa imagen.';
  const scale = Math.min(1, 2560 / Math.max(img.naturalWidth, img.naturalHeight));
  let data = src;
  if (scale < 1 || file.size > 1_500_000) {
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    data = c.toDataURL('image/jpeg', 0.88);
  }
  await store.set(IMG_KEY, data);
  localUrl = data;
  bg.src = 'local';
  saveBg();
  return null;
}
