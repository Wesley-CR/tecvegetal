// Prueba de humo: arranca el demo (app real + datos de ejemplo) en un DOM
// simulado y verifica que los pendientes aparezcan solos, sin tocar "actualizar".
// Regresión del bug en que el inicio no se enteraba de que llegaban los datos.
import { Window } from 'happy-dom';
import fs from 'node:fs';

const win = new Window({ url: 'https://tecdigital.tec.ac.cr/tecvegetal/', settings: { disableJavaScriptFileLoading: true } });
const errors = [];
win.console.error = (...a) => errors.push(a.map((x) => x?.stack || String(x)).join(' '));
win.eval(fs.readFileSync(process.argv[2] ?? 'demo/dist/demo.js', 'utf8'));
await new Promise((r) => setTimeout(r, 2500));
const txt = win.document.body.textContent.replace(/\s+/g, ' ');
await win.happyDOM.close();

const fails = [];
if (!/Pendientes \d+/.test(txt)) fails.push('la lista de pendientes no se llenó sola');
if (/No tenés entregas pendientes/.test(txt)) fails.push('el resumen dice que no hay pendientes');
if (errors.length) fails.push(`errores en consola:\n${errors.join('\n')}`);
if (fails.length) {
  console.error('SMOKE FALLÓ:\n- ' + fails.join('\n- '));
  process.exit(1);
}
console.log('smoke ok: los pendientes aparecen sin recargar');
