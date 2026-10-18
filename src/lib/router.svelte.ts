// Rutas de TEC Vegetal.
//
// TEC Vegetal vive en `/tecvegetal/...`: esas URLs no existen en TEC Digital, así que el
// servidor responde un 404 en ~40 ms en vez de tardar 1–1.6 s armando la página
// real, y el content script la reemplaza. Recargar o abrir en pestaña nueva es
// casi instantáneo.
//
// También se aceptan las URLs reales del sitio (links desde la página clásica,
// marcadores viejos): se toman igual y se reescriben a su forma `/tecvegetal/`.
//
//   /tecvegetal/                                             inicio
//   /tecvegetal/curso/CA/IC6831/S-2-2026.SJ.IC6831.40/          resumen
//   /tecvegetal/curso/CA/IC6831/S-2-2026.SJ.IC6831.40/evaluaciones
//   /tecvegetal/curso/CA/IC6831/S-2-2026.SJ.IC6831.40/documentos[/<carpeta>]

import type { Course } from './types';

export type Tab = 'resumen' | 'evals' | 'docs';
export type Route =
  | { name: 'home' }
  | { name: 'course'; courseId: string; base: string; tab: Tab; folderId?: string };

export const PREFIX = '/tecvegetal';
const REAL_COURSE = /^(\/dotlrn\/classes\/[^/]+\/[^/]+\/([^/]+)\/)(.*)$/;
const FAST_COURSE = /^\/tecvegetal\/curso\/([^/]+)\/([^/]+)\/([^/]+)\/?(.*)$/;

export function isFastPath(path: string): boolean {
  return path === PREFIX || path.startsWith(`${PREFIX}/`);
}

export function matchRoute(input: string | URL): Route | null {
  let u: URL;
  try { u = new URL(String(input), location.href); } catch { return null; }
  if (u.origin !== location.origin) return null;
  const p = u.pathname;

  if (isFastPath(p)) {
    const m = FAST_COURSE.exec(p);
    if (!m) return { name: 'home' }; // cualquier otra cosa bajo /tecvegetal cae al inicio
    const [, dept, code, seg, rest] = m;
    const base = `/dotlrn/classes/${dept}/${code}/${seg}/`;
    const course = (tab: Tab, folderId?: string): Route => ({ name: 'course', courseId: seg, base, tab, folderId });
    if (rest.startsWith('evaluaciones')) return course('evals');
    if (rest.startsWith('documentos')) return course('docs', /^documentos\/(\d+)/.exec(rest)?.[1]);
    return course('resumen');
  }

  if (p === '/dotlrn' || p === '/dotlrn/' || p === '/dotlrn/index') return u.search.includes('classic') ? null : { name: 'home' };

  const m = REAL_COURSE.exec(p);
  if (!m) return null;
  const [, base, courseId, rest] = m;
  const pageNum = u.searchParams.get('page_num');
  const course = (tab: Tab, folderId?: string): Route => ({ name: 'course', courseId, base, tab, folderId });

  if (rest === '' || rest === 'one-community' || rest === 'index') {
    if (pageNum == null || pageNum === '0') return course('resumen');
    return null; // ?page_num=N cambia según el curso: dejamos que el server redirija
  }
  if (rest.startsWith('evaluation/tda-ce-estudiante/tda-index')) return course('evals');
  if (rest === 'file-storage/' || rest === 'file-storage' || rest === 'file-storage/index') {
    return course('docs', /^#\/(\d+)/.exec(u.hash)?.[1]);
  }
  return null;
}

/** URL rápida de TEC Vegetal para una ruta. */
export function hrefFor(r: Route): string {
  if (r.name === 'home') return `${PREFIX}/`;
  const seg = r.base.replace(/^\/dotlrn\/classes\//, '');
  if (r.tab === 'evals') return `${PREFIX}/curso/${seg}evaluaciones`;
  if (r.tab === 'docs') return `${PREFIX}/curso/${seg}documentos${r.folderId ? `/${r.folderId}` : ''}`;
  return `${PREFIX}/curso/${seg}`;
}

/** URL de la página original de TEC Digital para una ruta. */
export function realUrlFor(r: Route): string {
  if (r.name === 'home') return '/dotlrn/index?classic';
  if (r.tab === 'evals') return `${r.base}evaluation/tda-ce-estudiante/tda-index?page_num=3`;
  if (r.tab === 'docs') return `${r.base}file-storage/${r.folderId ? `#/${r.folderId}` : ''}`;
  return r.base;
}

// Atajos para armar links desde la UI.
const courseRoute = (c: Course, tab: Tab, folderId?: string): Route => ({ name: 'course', courseId: c.id, base: c.base, tab, folderId });
export const href = {
  home: () => hrefFor({ name: 'home' }),
  course: (c: Course) => hrefFor(courseRoute(c, 'resumen')),
  evals: (c: Course) => hrefFor(courseRoute(c, 'evals')),
  docs: (c: Course, folderId?: string) => hrefFor(courseRoute(c, 'docs', folderId)),
};

export const router = $state<{ route: Route }>({ route: matchRoute(location.href) ?? { name: 'home' } });

/** Si se entró por una URL real del sitio, la reescribe a su forma /tecvegetal/ (recargar pasa a ser rápido). */
export function canonicalize(): void {
  if (isFastPath(location.pathname)) return;
  try { history.replaceState(null, '', hrefFor(router.route)); } catch { /* sandbox */ }
}

export function navigate(url: string, opts: { replace?: boolean } = {}): void {
  const r = matchRoute(url);
  if (!r) {
    location.assign(url);
    return;
  }
  const target = new URL(hrefFor(r), location.href).href;
  try {
    if (target !== location.href) history[opts.replace ? 'replaceState' : 'pushState'](null, '', target);
  } catch { /* algunos iframes con sandbox no dejan tocar el historial */ }
  router.route = r;
  window.scrollTo({ top: 0 });
}

const CLASSIC_KEY = 'tecvegetal:classic';

/** Abre la página original de TEC Digital en esta pestaña sin que TEC Vegetal la tome. */
export function openClassic(url: string): void {
  try { sessionStorage.setItem(CLASSIC_KEY, '1'); } catch { /* nada */ }
  location.assign(url);
}

/** Abre en TEC Digital la página equivalente a la vista actual. */
export function openClassicForCurrent(): void {
  openClassic(realUrlFor(router.route));
}

export function classicRequested(): boolean {
  try { return sessionStorage.getItem(CLASSIC_KEY) === '1'; } catch { return false; }
}

export function leaveClassic(): void {
  try { sessionStorage.removeItem(CLASSIC_KEY); } catch { /* nada */ }
}

/** Intercepta clicks en links internos que TEC Vegetal sabe pintar. */
export function installLinkInterceptor(root: Document | HTMLElement = document): void {
  root.addEventListener('click', (ev) => {
    const e = ev as MouseEvent;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.classic != null) return;
    if (a.getAttribute('href')!.startsWith('#')) return; // ancla dentro de la vista actual
    if (!matchRoute(a.href)) return;
    e.preventDefault();
    navigate(a.href);
  });
  window.addEventListener('popstate', () => {
    router.route = matchRoute(location.href) ?? { name: 'home' };
  });
}
