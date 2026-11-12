import { describe, expect, it } from 'vitest';
import { dominantTint, hexToTint, rgbToOklch } from '../src/lib/tint';

describe('tono', () => {
  it('convierte a OKLCH (el azul original anda por h≈255)', () => {
    const { h, l } = rgbToOklch(0x0f, 0x1b, 0x2b);
    expect(h).toBeGreaterThan(240);
    expect(h).toBeLessThan(270);
    expect(l).toBeCloseTo(0.21, 1);
  });

  it('un gris queda neutro y un color fuerte se suaviza', () => {
    expect(hexToTint('#808080')).toEqual({ h: expect.any(Number), c: 0 });
    const red = hexToTint('#ff0000')!;
    expect(red.h).toBeGreaterThan(20);
    expect(red.h).toBeLessThan(35);
    expect(red.c).toBeLessThanOrEqual(0.07);
  });

  it('tono dominante: gana el color, no las sombras', () => {
    const px = new Uint8ClampedArray(4 * 100);
    for (let i = 0; i < 100; i++) {
      const purple = i < 30;
      px.set(purple ? [120, 60, 200, 255] : [5, 5, 5, 255], i * 4);
    }
    const t = dominantTint(px);
    expect(t.h).toBeGreaterThan(280);
    expect(t.h).toBeLessThan(310);
    expect(t.c).toBeGreaterThan(0);
  });
});
