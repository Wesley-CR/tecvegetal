import { describe, expect, it, vi } from 'vitest';
import { Resource, resource } from '../src/lib/data/resource.svelte';

describe('recursos', () => {
  it('un fallo no se reintenta en bucle (regresión: 1500 requests en 10 s)', async () => {
    const loader = vi.fn(async () => { throw new Error('404'); });
    const r = resource('test:falla', 60_000, loader);
    for (let i = 0; i < 50; i++) await r.load();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(r.error).toBe('404');
  });

  it('actualizar a mano (force) sí reintenta aunque esté en espera', async () => {
    const loader = vi.fn(async () => { throw new Error('caído'); });
    const r = resource('test:force', 60_000, loader);
    await r.load();
    await r.load({ force: true });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('la espera crece y tiene tope', () => {
    expect(Resource.backoff(0)).toBe(0);
    expect(Resource.backoff(1)).toBe(15_000);
    expect(Resource.backoff(2)).toBe(30_000);
    expect(Resource.backoff(20)).toBe(5 * 60_000);
  });

  it('con datos frescos no vuelve a pedir', async () => {
    const loader = vi.fn(async () => 42);
    const r = resource('test:ok', 60_000, loader);
    await r.load();
    await r.load();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(r.data).toBe(42);
  });
});
