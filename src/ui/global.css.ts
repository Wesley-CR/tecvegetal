// Estilos globales, inyectados una vez al tomar la página.
// Dirección: un planificador de estudiante, no un dashboard SaaS. Tinta azul del
// TEC de fondo, una sola tipografía hecha para leerse rápido (Atkinson Hyperlegible
// Next), listas densas con separadores en vez de tarjetas, y el color de cada
// curso como única señal de identidad.

export interface FontUrls { latin: string; latinExt: string }

const fontFace = (f: FontUrls | undefined) =>
  f
    ? `
@font-face { font-family: "TD Atkinson"; font-weight: 200 800; font-display: swap;
  src: url("${f.latin}") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "TD Atkinson"; font-weight: 200 800; font-display: swap;
  src: url("${f.latinExt}") format("woff2");
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }`
    : '';

const LIGHT = `
  color-scheme: light;
  --bg: #f2f4f7; --surface: #ffffff; --raise: #e9edf3; --line: #d9e0e9; --line-strong: #b9c4d2;
  --text: #13233a; --muted: #56677f; --faint: #8796ab; --focus: #1f6fb2; --mark: #c48a00;
  --u-now: #c93526; --u-soon: #b76300; --u-week: #7d6f00; --u-later: #5d7190; --ok: #2f7d3d;
  --side: #e6ebf2; --sel: rgb(31 111 178 / 0.2);`;

export const globalCss = (fonts?: FontUrls) => `
${fontFace(fonts)}
:root {
  color-scheme: dark;
  --bg: #0f1b2b; --surface: #14233a; --raise: #1a2c46; --line: #22354f; --line-strong: #34496a;
  --text: #e6ecf4; --muted: #91a2ba; --faint: #61758f; --focus: #ffd36e; --mark: #ffd36e;
  --u-now: #ff7a6b; --u-soon: #f3a648; --u-week: #d8c860; --u-later: #7088a6; --ok: #7fd18e;
  --font: "TD Atkinson", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --fs-xs: 12.5px; --fs-s: 14px; --fs-m: 15.5px; --fs-l: 18px; --fs-xl: 22px; --fs-xxl: 28px;
  --side: #0c1724; --sel: rgb(255 211 110 / 0.28);
  --r: 6px;
}
:root[data-theme="light"] {${LIGHT} }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) {${LIGHT} } }

.c { --c: var(--c-ink, var(--muted)); }
:root[data-theme="light"] .c { --c: var(--c-paper, var(--muted)); }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) .c { --c: var(--c-paper, var(--muted)); } }

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg); color: var(--text);
  font: 400 var(--fs-m)/1.55 var(--font);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
::selection { background: var(--sel); color: var(--text); }
html { scrollbar-color: var(--line-strong) transparent; scrollbar-width: thin; }
input, textarea { caret-color: var(--focus); }
a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
button { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 2px; }
h1, h2, h3 { margin: 0; font-weight: 700; letter-spacing: -0.01em; text-wrap: balance; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 0 44px; box-sizing: content-box; }
@media (max-width: 900px) { .wrap { padding: 0 24px; } }
@media (max-width: 640px) { .wrap { padding: 0 16px; } }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); }
.skel { display: block; height: 12px; border-radius: 2px; background: var(--raise); animation: skel 1.2s ease-in-out infinite alternate; }
@keyframes skel { from { opacity: 0.55; } to { opacity: 1; } }
.muted { color: var(--muted); }
.section-title { font-size: var(--fs-s); font-weight: 700; color: var(--muted); margin: 0 0 8px; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: var(--r);
  border: 1px solid var(--line-strong); background: transparent;
  cursor: pointer; font-size: var(--fs-s); font-weight: 600; white-space: nowrap;
}
.btn:hover { background: var(--raise); text-decoration: none; }
.btn.primary { background: var(--text); color: var(--bg); border-color: var(--text); }
.btn.primary:hover { opacity: 0.9; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.prose { font-size: var(--fs-s); line-height: 1.55; overflow-wrap: anywhere; }
.prose p { margin: 0 0 8px; }
.prose ul, .prose ol { margin: 0 0 8px; padding-left: 18px; }
.prose a { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--line-strong); }
.prose a:hover { text-decoration-color: currentColor; }
.prose img { max-width: 100%; height: auto; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
.prose td, .prose th { border-bottom: 1px solid var(--line); padding: 4px 8px 4px 0; text-align: left; vertical-align: top; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;
