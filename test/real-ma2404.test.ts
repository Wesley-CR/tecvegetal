import { expect, it } from 'vitest';
import { parseEvals } from '../src/lib/parse/evals';
import { pendingItems, project } from '../src/lib/grades';

// Estructura copiada del HTML real de Evaluaciones (MA2404, nov 2026): el valor de
// cada parcial viene en el encabezado y en "Valor de la Asignación"; las tareas
// vienen "Ponderado" con valor 0.00 y nota sobre 100.
const acc = (id: string, name: string, head: string, valor: string, nota: string) => `
<div class="container_accor" assign_id="${id}">
  <div class="head_subaccord"><div title="${name}"><span class="assignNameText">${name}</span><span class="text_right vt_grade_student">${head}</span></div></div>
  <div class="content_delivery"><div class="col-md-6">
    <div class="content_description row"><p class="title_subsection">Valor de la Asignación:</p><div class="body_style">${valor}</div></div>
    <div class="content_description row"><p class="title_subsection">Nota obtenida:</p><div class="body_style">${nota}</div></div>
  </div></div>
</div>`;
const pond = (g: string) => `<div class="divWeighted"><div class="textw">Ponderado</div> <div class="gradeW">${g}</div></div>`;
const html = `<div id="content_assigns">
<div id="h_1" class="asign_student title_acor_grade"><span class="clase" title="Exámenes parciales (75%)">Exámenes parciales </span><div class="title_right sub_total hasGradeClass" item_weight="75">38.991 </div></div>
<div class="container_accor_detail">
${acc('p1', 'I parcial', ' 16.49 / 23.00', '23.00', '71.7 / 100')}
${acc('p2', 'II parcial', ' 22.50 / 25.00', '25.00', '90.0 / 100')}
${acc('p3', 'III parcial', ' -- / 27.00', '27.00', '-- / 100')}
</div>
<div id="h_2" class="asign_student title_acor_grade"><span class="clase" title="Asignaciones (25%)">Asignaciones </span><div class="title_right sub_total hasGradeClass" item_weight="25">16.43 </div></div>
<div class="container_accor_detail">
${['100.0', '100.0', '95.0', '65.0', '100.0', '--', '--'].map((g, i) => acc(`a${i + 1}`, `${i + 1}AS`, pond(g), '0.00', `${g} / 100`)).join('')}
</div></div>`;

it('MA2404 real: III parcial vale 27 y cada tarea 25/7', () => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const data = parseEvals(doc, 'https://tecdigital.tec.ac.cr/x');
  const items = pendingItems(data);
  expect(items.map((i) => [i.name, Math.round(i.worth * 100) / 100, i.exact])).toEqual([
    ['III parcial', 27, true],
    ['6AS', 3.57, true],
    ['7AS', 3.57, true],
  ]);
  const p = project(data);
  expect(p.evaluated).toBe(65.9);
  expect(p.remaining).toBe(34.1);
});
