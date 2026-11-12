import { flushSync, mount } from 'svelte';
import App from '../ui/App.svelte';
import { globalCss, type FontUrls } from '../ui/global.css.ts';
import { browser } from 'wxt/browser';
import { canonicalize, classicRequested, hrefFor, installLinkInterceptor, isFastPath, leaveClassic, matchRoute } from './router.svelte';
import { startClock } from './clock.svelte';

import { VERSION, showFatal } from './fatal';

const log = (...a: unknown[]) => console.info('[TEC Vegetal]', ...a);

/**
 * Corre en document_start. Si la URL es una vista que TEC Vegetal sabe pintar, corta la
 * carga de la página original (window.stop) antes de que baje el resto del HTML,
 * los ~25 scripts y los ~30 CSS, y monta la app en su lugar.
 * Si no, deja la página clásica y agrega un botón flotante para volver.
 */
export function boot(): void {
  if (window.top !== window.self) return; // nunca dentro de iframes del sitio
  const route = matchRoute(location.href);

  // /tecvegetal/... no existe en el servidor (es un 404 rápido): siempre se toma.
  if (isFastPath(location.pathname)) {
    leaveClassic();
    start();
    return;
  }

  if (!route || classicRequested()) {
    onReady(() => addReturnPill(route ? hrefFor(route) : hrefFor({ name: 'home' })));
    return;
  }

  start();
  canonicalize();
}

function start(): void {
  log(`v${VERSION} tomando ${location.pathname}`);
  try {
    // En Chrome NO se llama window.stop(): marca el parser como abortado y
    // después document.open() no hace nada. document.open() ya corta la carga.
    if (!import.meta.env.CHROME) window.stop();
    takeOver();
    log('montado');
  } catch (err) {
    console.error('[TEC Vegetal] no se pudo montar', err);
    showFatal(err);
  }
}

function takeOver(): void {
  if (import.meta.env.CHROME) {
    // Chrome solo empieza a pintar cuando SU parser inserta <body> o termina de
    // parsear. Tras window.stop() eso nunca pasa: si armamos el DOM a mano la
    // página queda completa pero invisible (pantalla en blanco). document.open()
    // + write() + close() crea un parser nuevo que sí termina y destraba el pintado.
    document.open();
    document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TEC Vegetal</title></head><body></body></html>');
    document.close();
  } else {
    // Firefox pinta bien con el DOM armado a mano (y su revisión prefiere no usar document.write).
    const root = document.documentElement ?? document.appendChild(document.createElement('html'));
    root.replaceChildren();
    const head = document.createElement('head');
    const charset = document.createElement('meta');
    charset.setAttribute('charset', 'utf-8');
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1';
    const title = document.createElement('title');
    title.textContent = 'TEC Vegetal';
    head.append(charset, viewport, title);
    root.append(head, document.createElement('body'));
  }
  const html = document.documentElement;
  html.setAttribute('lang', 'es');
  try {
    const t = localStorage.getItem('tecvegetal:theme');
    if (t === 'light' || t === 'dark') html.setAttribute('data-theme', t);
  } catch { /* nada */ }
  const style = document.createElement('style');
  style.textContent = globalCss(fontUrls());
  document.head.appendChild(style);
  // Errores tardíos (en efectos, después de montar) también se muestran.
  window.addEventListener('error', (e) => showFatal(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    // Fallos de red ya los maneja la UI (aviso de sesión o servidor caído).
    if (r && /SessionExpired|ServerDown|TooManyRequests/.test(r.constructor?.name ?? '')) return;
    showFatal(r);
  });
  startClock();
  installLinkInterceptor(document);
  // Montar dentro de flushSync: en Firefox las microtareas del content script
  // pueden correr a mitad del montaje, Svelte se queda sin batch y revienta con
  // "can't access property transfer_effects". Así no se agenda nada a mitad.
  flushSync(() => mount(App, { target: document.body! }));
  // Red de seguridad: si a los 4 s no hay nada visible, avisar en vez de quedar en blanco.
  setTimeout(() => {
    if (!document.querySelector('header')) showFatal(new Error('La app no llegó a dibujarse (no hay barra superior a los 4 s).'));
  }, 4000);
  // Si el navegador no pinta ningún frame en 5 s (con la pestaña visible), el
  // DOM está pero no se ve: mejor caer a la página normal que quedar en blanco.
  let painted = false;
  requestAnimationFrame(() => { painted = true; });
  setTimeout(() => {
    if (painted || document.hidden) return;
    console.error('[TEC Vegetal] el navegador no pintó la página; se abre la versión normal');
    try { sessionStorage.setItem('tecvegetal:classic', '1'); } catch { /* nada */ }
    location.assign('/dotlrn/index?classic');
  }, 5000);
}

function fontUrls(): FontUrls | undefined {
  try {
    return { latin: browser.runtime.getURL('/fonts/ahn-latin.woff2'), latinExt: browser.runtime.getURL('/fonts/ahn-latin-ext.woff2') };
  } catch {
    return undefined; // sin la fuente se usa la del sistema
  }
}

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/** Botón chico sobre la página clásica para volver a TEC Vegetal (a la vista equivalente, si existe). */
function addReturnPill(target: string): void {
  if (!document.body || document.getElementById('tecvegetal-pill')) return;
  const a = document.createElement('a');
  a.id = 'tecvegetal-pill';
  a.textContent = 'Volver a TEC Vegetal';
  a.href = target;
  a.addEventListener('click', () => leaveClassic());
  Object.assign(a.style, {
    position: 'fixed', right: '18px', bottom: '18px', zIndex: '2147483647',
    padding: '9px 14px', borderRadius: '999px', background: '#0e1a2b', color: '#e8eef6',
    font: '600 13px/1 system-ui, sans-serif', textDecoration: 'none',
    boxShadow: '0 6px 20px rgba(0,0,0,.35)', border: '1px solid #22385a',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(a);
}
