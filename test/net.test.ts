import { afterEach, describe, expect, it, vi } from 'vitest';

describe('red', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('nunca pasa de 60 requests por minuto al TEC, pase lo que pase', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { getText, TooManyRequests } = await import('../src/lib/data/net');
    const results = await Promise.allSettled(Array.from({ length: 80 }, (_, i) => getText(`/x/${i}`)));
    expect(fetchMock).toHaveBeenCalledTimes(60);
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(rejected).toHaveLength(20);
    expect(rejected[0].reason).toBeInstanceOf(TooManyRequests);
  });
});
