import { browser } from 'wxt/browser';

export const VERSION: string = (() => { try { return browser.runtime.getManifest().version; } catch { return '?'; } })();

/**
 * Si algo revienta, se muestra en la página (nunca una pantalla en blanco
 * muda): el error para poder reportarlo y un link a la página normal.
 */
let fatalShown = false;
export function showFatal(err: unknown): void {
  if (fatalShown) return;
  fatalShown = true;
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err);
  const doc = document;
  if (!doc.body) doc.documentElement?.append(doc.createElement('body'));
  const box = doc.createElement('div');
  box.setAttribute('role', 'alert');
  Object.assign(box.style, {
    position: 'fixed', inset: '0', zIndex: '2147483647', overflow: 'auto', padding: '32px',
    background: '#0f1b2b', color: '#e6ecf4', font: '15px/1.5 system-ui, sans-serif',
  } satisfies Partial<CSSStyleDeclaration>);
  const h = doc.createElement('h1');
  h.textContent = 'TEC Vegetal tuvo un error';
  Object.assign(h.style, { fontSize: '22px', margin: '0 0 8px' });
  const p = doc.createElement('p');
  p.textContent = `Versión ${VERSION}. Mandale un screenshot de esto a quien te pasó la extensión. Mientras tanto podés usar la página normal:`;
  const a = doc.createElement('a');
  a.href = '/dotlrn/index?classic';
  a.textContent = 'Abrir TEC Digital normal';
  a.addEventListener('click', () => { try { sessionStorage.setItem('tecvegetal:classic', '1'); } catch { /* nada */ } });
  Object.assign(a.style, { color: '#ffd36e', fontWeight: '700' });
  const pre = doc.createElement('pre');
  pre.textContent = msg;
  Object.assign(pre.style, { whiteSpace: 'pre-wrap', marginTop: '20px', padding: '12px', background: '#14233a', borderRadius: '6px', fontSize: '12px' });
  box.append(h, p, a, pre);
  doc.body?.append(box);
}

