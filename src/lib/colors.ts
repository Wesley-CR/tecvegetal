// Cada curso del semestre tiene un color fijo, usado igual en toda la app
// (riel de entregas, listas, encabezados). El color identifica, no decora.
// Elegidos para distinguirse entre sí sobre el fondo tinta y sobre papel.
const HUES = [
  { ink: '#7cc4ff', paper: '#1f6fb2' },
  { ink: '#f5a97f', paper: '#b4532a' },
  { ink: '#9fe0a8', paper: '#2f7d3d' },
  { ink: '#d7a6ff', paper: '#7a3fb3' },
  { ink: '#ffd36e', paper: '#9a6b00' },
  { ink: '#ff9cc2', paper: '#b23a6b' },
  { ink: '#8ee6df', paper: '#167a72' },
];

export function courseColor(index: number): { ink: string; paper: string } {
  return HUES[((index % HUES.length) + HUES.length) % HUES.length];
}

/** Variables CSS para un curso: --c (tema actual) se resuelve en el CSS global. */
export function courseVars(index: number): string {
  const c = courseColor(index);
  return `--c-ink:${c.ink};--c-paper:${c.paper};`;
}
