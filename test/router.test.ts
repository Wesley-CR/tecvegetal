import { describe, expect, it } from 'vitest';
import { hrefFor, matchRoute, realUrlFor } from '../src/lib/router.svelte';

const B = '/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/';

describe('rutas', () => {
  it('URLs reales del sitio', () => {
    expect(matchRoute('/dotlrn/index')).toEqual({ name: 'home' });
    expect(matchRoute(B)).toMatchObject({ name: 'course', tab: 'resumen', courseId: 'S-2-2026.SJ.IC6831.40', base: B });
    expect(matchRoute(`${B}evaluation/tda-ce-estudiante/tda-index?page_num=3`)).toMatchObject({ tab: 'evals' });
    expect(matchRoute(`${B}file-storage/#/245829280`)).toMatchObject({ tab: 'docs', folderId: '245829280' });
    expect(matchRoute(`${B}?page_num=1`)).toBeNull(); // Calendario: página original
    expect(matchRoute('/dotlrn/index?classic')).toBeNull();
  });

  it('URLs rápidas ida y vuelta', () => {
    for (const r of [
      { name: 'home' as const },
      { name: 'course' as const, courseId: 'S-2-2026.SJ.IC6831.40', base: B, tab: 'resumen' as const },
      { name: 'course' as const, courseId: 'S-2-2026.SJ.IC6831.40', base: B, tab: 'evals' as const },
      { name: 'course' as const, courseId: 'S-2-2026.SJ.IC6831.40', base: B, tab: 'docs' as const, folderId: '42' },
    ]) {
      const h = hrefFor(r);
      expect(h.startsWith('/tecvegetal/')).toBe(true);
      expect(matchRoute(h)).toEqual({ ...r, ...(r.name === 'course' && !('folderId' in r) ? { folderId: undefined } : {}) });
    }
  });

  it('cada vista tiene su página original', () => {
    expect(realUrlFor({ name: 'course', courseId: 'x', base: B, tab: 'docs', folderId: '7' })).toBe(`${B}file-storage/#/7`);
    expect(realUrlFor({ name: 'home' })).toBe('/dotlrn/index?classic');
  });
});
