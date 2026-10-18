import { mount } from 'svelte';
import App from '../ui/App.svelte';
import { globalCss, type FontUrls } from '../ui/global.css.ts';
import { browser } from 'wxt/browser';
import { canonicalize, classicRequested, hrefFor, installLinkInterceptor, isFastPath, leaveClassic, matchRoute } from './router.svelte';
import { startClock } from './clock.svelte';

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
  try {
    window.stop();
    takeOver();
  } catch (err) {
    console.error('[TEC Vegetal] no se pudo montar, se muestra la página original', err);
    try { sessionStorage.setItem('tecvegetal:classic', '1'); } catch { /* nada */ }
    if (isFastPath(location.pathname)) location.assign('/dotlrn/index?classic');
    else location.reload();
  }
}

function takeOver(): void {
  const html = document.documentElement ?? document.appendChild(document.createElement('html'));
  // Página nueva armada con APIs del DOM (sin innerHTML).
  html.replaceChildren();
  const head = document.createElement('head');
  const charset = document.createElement('meta');
  charset.setAttribute('charset', 'utf-8');
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  const title = document.createElement('title');
  title.textContent = 'TEC Vegetal';
  head.append(charset, viewport, title);
  html.append(head, document.createElement('body'));
  html.setAttribute('lang', 'es');
  try {
    const t = localStorage.getItem('tecvegetal:theme');
    if (t === 'light' || t === 'dark') html.setAttribute('data-theme', t);
  } catch { /* nada */ }
  const style = document.createElement('style');
  style.textContent = globalCss(fontUrls());
  document.head.appendChild(style);
  startClock();
  installLinkInterceptor(document);
  mount(App, { target: document.body });
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
