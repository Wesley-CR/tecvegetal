import { describe, expect, it } from 'vitest';
import { parseCourses } from '../src/lib/parse/courses';
import { parseEvals, statusOf } from '../src/lib/parse/evals';
import { parseFolder, parseRootFolderId } from '../src/lib/parse/docs';
import { crToEpoch, parseAnsiCR, parseDmyCR, fmtWhen } from '../src/lib/dates';

const html = (s: string) => new DOMParser().parseFromString(s, 'text/html');

// Estructura copiada del HTML real (16/10/2026), con datos inventados.
const HOME = `
<ul class="mktree"><li>Cursos<ul>
  <li>SEMESTRE 2 2026<ul>
    <li><a href="/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/">Aseguramiento de la calidad del software GR 40</a></li>
    <li><a href="/dotlrn/classes/MA/MA2404/S-2-2026.SJ.MA2404.40/">Probabilidades GR 40</a></li>
  </ul></li>
  <li>SEMESTRE 1 2026<ul>
    <li><a href="/dotlrn/classes/CS/CS2101/S-1-2026.AL.CS2101.20/">Ambiente humano GR 20 <i class="material-icons">beenhere</i></a></li>
  </ul></li>
</ul></li></ul>
<a href="/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/news/item?item_id=1">noticia</a>`;

const assign = (o: { id: string; name: string; due?: string; dueAttr?: string; data?: string; grade?: string; dropzone?: boolean; late?: boolean }) => `
<div class="container_accor" assign_id="${o.id}">
  <div class="head_subaccord"><div><span class="assignNameText">${o.name}</span><span class="vt_grade_student">-- / 0.00</span></div></div>
  <div class="content_delivery"><div class="row cnt_delivery_b">
    <div class="col-md-6">
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection">Descripción :</p><div class="body_style">No hay descripción para la asignación</div></div></div>
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection">Fecha de Entrega :</p><div class="body_style">${o.due ?? 'Fecha no definida'}</div></div></div>
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection margin_cero">Posibilidad de entregar después de fecha límite: </p>
        <div class="body_style"><div><input type="radio" disabled ${o.late ? 'checked' : ''}><label>Sí</label></div><div><input type="radio" disabled ${o.late ? '' : 'checked'}><label>No</label></div></div></div></div>
    </div>
    <div class="col-md-6">
      ${o.dropzone ? `<button class="btn_send_answer" due_date="${o.dueAttr}">Entregar</button><div class="container_dropzone" late_submit="${o.late ? 't' : 'f'}"></div>` : ''}
      ${o.data != null ? `<div class="content_description row"><p class="title_subsection">Entrega:</p><div id="data_file_${o.id}" class="body_style answerStyle">${o.data}</div></div>` : ''}
      <div class="content_description row"><p class="title_subsection">Nota obtenida:</p><div class="body_style">${o.grade ?? '-- / 100'}</div></div>
    </div>
  </div></div>
</div>
<div class="title_acor" style="display:none"><span class="assignNameText">${o.name}</span></div>`;

const EVALS = `<div id="contenido"><div id="content_assigns">
  <div id="h_1" class="asign_student title_acor_grade"><span class="clase" title="Exámenes (25%)">Exámenes </span><div class="title_right sub_total" item_weight="25">11.90</div></div>
  <div class="container_accor_detail">
    ${assign({ id: 'a1', name: 'Examen 1', grade: '95.2 / 100' })}
  </div>
  <div id="h_2" class="asign_student title_acor_grade"><span class="clase" title="Investigación (15%)">Investigación </span><div class="title_right sub_total" item_weight="15">--</div></div>
  <div class="container_accor_detail">
    ${assign({ id: 'a2', name: 'Avance 1', due: '16/10/2026 23:45', dueAttr: '2026-10-16 23:45:00 GMT', dropzone: true, data: 'No hay entregas de archivo o enlace' })}
    ${assign({ id: 'a3', name: 'Avance 0', due: '06/10/2026 12:00', dueAttr: '2026-10-06 12:00:00 GMT', dropzone: true, data: 'No hay entregas de archivo o enlace', late: true })}
    ${assign({ id: 'a4', name: 'Avance -1', due: '01/10/2026 12:00', dueAttr: '2026-10-01 12:00:00 GMT', dropzone: true, data: '<a href="../../evaluation/view/x.pdf">x.pdf</a>' })}
  </div>
</div></div>
<p>Nota Total (sin redondear)</p><p>15.0 / 100</p>`;

describe('fechas', () => {
  it('el "GMT" de TEC Digital es hora de Costa Rica', () => {
    expect(parseAnsiCR('2026-10-16 23:45:00 GMT')).toBe(Date.parse('2026-10-17T05:45:00Z'));
    expect(parseDmyCR('16/10/2026 23:45')).toBe(parseAnsiCR('2026-10-16 23:45:00'));
    expect(parseDmyCR('Fecha no definida')).toBeNull();
  });
  it('formatea relativo al día en CR', () => {
    const now = crToEpoch(2026, 10, 16, 22, 54);
    expect(fmtWhen(crToEpoch(2026, 10, 16, 23, 45), now)).toBe('hoy 23:45');
    expect(fmtWhen(crToEpoch(2026, 10, 17, 1, 0), now)).toBe('mañana 01:00');
  });
});

describe('cursos', () => {
  const d = parseCourses(html(HOME));
  it('toma el primer grupo del árbol como semestre actual', () => {
    expect(d.currentLabel).toBe('Semestre 2 2026');
    expect(d.current.map((c) => c.code)).toEqual(['IC6831', 'MA2404']);
    expect(d.current[0]).toMatchObject({ name: 'Aseguramiento de la calidad del software', group: '40', campus: 'SJ', base: '/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/' });
  });
  it('quita texto de íconos y no duplica', () => {
    expect(d.past[0].courses[0].name).toBe('Ambiente humano');
    expect(d.current).toHaveLength(2);
  });
});

describe('evaluaciones', () => {
  const url = 'https://tecdigital.tec.ac.cr/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/evaluation/tda-ce-estudiante/tda-index';
  const e = parseEvals(html(EVALS), url);
  const now = crToEpoch(2026, 10, 16, 22, 54);
  it('categorías con peso y subtotal', () => {
    expect(e.categories.map((c) => [c.name, c.weight, c.earned])).toEqual([['Exámenes', 25, 11.9], ['Investigación', 15, null]]);
    expect(e.total).toBe(15);
  });
  it('ignora las copias colapsadas', () => {
    expect(e.categories[1].assignments).toHaveLength(3);
  });
  it('estado real, no "tiene dropzone"', () => {
    const [ex] = e.categories[0].assignments;
    const [pend, late, done] = e.categories[1].assignments;
    expect(statusOf(ex, now)).toBe('graded');
    expect(ex.grade).toBe(95.2);
    expect(statusOf(pend, now)).toBe('pending');
    expect(pend.dueAt).toBe(crToEpoch(2026, 10, 16, 23, 45));
    expect(statusOf(late, now)).toBe('late');
    expect(statusOf(done, now)).toBe('submitted');
    expect(done.submissionLinks[0].href).toBe('https://tecdigital.tec.ac.cr/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/evaluation/view/x.pdf');
  });
});

describe('documentos', () => {
  it('saca el folder raíz del shell de Angular', () => {
    expect(parseRootFolderId('\t\t$rootScope.GL_FOLDER_ID = 245829280;')).toBe('245829280');
  });
  it('arma URLs de vista y ordena carpetas primero', () => {
    const f = parseFolder({
      object_id: 1, name: 'Raíz', last_modified_ansi: '2026-07-20 20:45:31',
      elements: [
        { object_id: 3, name: 'Guía.pdf', type: 'application/pdf', fs_type: 'file', mime_type: 'application/pdf', file_url: 'Apuntes/Guía.pdf', last_modified_ansi: '2026-07-30 15:16:30', new_p: 0, author: { name: 'Profe' } },
        { object_id: 2, name: 'Tareas', type: 'folder', fs_type: 'folder', content_size: 4, new_p: '1' },
      ],
    }, '/dotlrn/classes/MA/MA2404/S-2-2026.SJ.MA2404.40/');
    expect(f.items.map((i) => i.kind)).toEqual(['folder', 'file']);
    expect(f.items[0]).toMatchObject({ count: 4, isNew: true });
    expect(f.items[1].href).toBe('/dotlrn/classes/MA/MA2404/S-2-2026.SJ.MA2404.40/file-storage/view/Apuntes%2FGu%C3%ADa.pdf');
  });
});
