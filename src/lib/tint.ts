// Tono de la interfaz: en vez del azul fijo, fondos y paneles toman el matiz que
// elijas (o el de tu wallpaper). Se trabaja en OKLCH para que la luminosidad no
// cambie con el matiz: un rojo y un verde quedan igual de oscuros.

export interface Tint { h: number; c: number }

/** Chroma máxima para fondos: más que esto se ve chillón. */
export const MAX_C = 0.07;

export const PRESETS: { name: string; tint: Tint | null }[] = [
  { name: 'Azul (original)', tint: null },
  { name: 'Grafito', tint: { h: 260, c: 0 } },
  { name: 'Pizarra', tint: { h: 230, c: 0.015 } },
  { name: 'Verde azulado', tint: { h: 195, c: 0.035 } },
  { name: 'Verde', tint: { h: 150, c: 0.03 } },
  { name: 'Café', tint: { h: 60, c: 0.025 } },
  { name: 'Vino', tint: { h: 15, c: 0.04 } },
  { name: 'Morado', tint: { h: 300, c: 0.04 } },
];

const lin = (v: number) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** sRGB (0–255) a OKLCH. */
export function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
  const R = lin(r), G = lin(g), B = lin(b);
  const l_ = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m_ = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s_ = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(a, bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

export function hexToTint(hex: string): Tint | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const { c, h } = rgbToOklch((n >> 16) & 255, (n >> 8) & 255, n & 255);
  // Los grises puros no tienen matiz que valga la pena: quedan neutros.
  return { h: Math.round(h), c: c < 0.02 ? 0 : Math.min(MAX_C, +(c * 0.35).toFixed(3)) };
}

/**
 * Matiz dominante de una imagen (pixeles RGBA). Pesa más los pixeles con color,
 * así un cielo morado con poco detalle gana sobre el negro de las sombras.
 */
export function dominantTint(px: Uint8ClampedArray): Tint {
  let x = 0, y = 0, wSum = 0, cSum = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const { l, c, h } = rgbToOklch(px[i], px[i + 1], px[i + 2]);
    n++;
    cSum += c;
    if (l < 0.12 || l > 0.97) continue;
    const w = c * c;
    x += Math.cos((h * Math.PI) / 180) * w;
    y += Math.sin((h * Math.PI) / 180) * w;
    wSum += w;
  }
  const avgC = n ? cSum / n : 0;
  if (wSum < 1e-6 || avgC < 0.015) return { h: 260, c: 0 };
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { h: Math.round(h), c: Math.min(MAX_C, +(avgC * 0.45).toFixed(3)) };
}

/** Color de muestra para el botón del preset (el fondo oscuro con ese tono). */
export const swatch = (t: Tint | null) => (t ? `oklch(0.42 ${Math.max(t.c * 2, t.c ? 0.06 : 0)} ${t.h})` : '#1e3a5f');
