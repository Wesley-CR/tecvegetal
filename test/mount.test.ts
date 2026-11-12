import { describe, expect, it } from 'vitest';
import { flushSync, mount } from 'svelte';
import App from './fixtures/mount-app.svelte';
import { pre } from './fixtures/mount-pre.svelte';

// Firefox puede correr microtareas del content script a mitad de mount(). Sin
// flushSync, Svelte se queda sin batch y revienta con "transfer_effects".
function withMidMountCheckpoint(fn: () => void) {
  const q: (() => void)[] = [];
  const real = globalThis.queueMicrotask;
  globalThis.queueMicrotask = (f) => { q.push(f); };
  (globalThis as any).__checkpoint = () => { while (q.length) q.shift()!(); };
  pre.n++;
  try { fn(); } finally {
    globalThis.queueMicrotask = real;
    (globalThis as any).__checkpoint = undefined;
  }
}

describe('montaje', () => {
  it('mount sin flushSync revienta si corren microtareas a mitad (lo que pasa en Firefox)', () => {
    expect(() => withMidMountCheckpoint(() => mount(App, { target: document.createElement('div') }))).toThrow(/transfer_effects/);
  });

  it('mount dentro de flushSync (como en boot.ts) aguanta', () => {
    const t = document.createElement('div');
    withMidMountCheckpoint(() => flushSync(() => mount(App, { target: t })));
    expect(t.textContent).toContain('hijo');
  });
});
