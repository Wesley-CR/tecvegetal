// Reemplazo de src/lib/data/net.ts para el demo: genera HTML/JSON con la misma
// estructura que TEC Digital, con fechas relativas a "ahora". Datos inventados.

export class SessionExpired extends Error {}
export class ServerDown extends Error {}

const H = 3600_000;
const D = 24 * H;
const now = Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function crAnsi(t: number): string {
  const d = new Date(t - 6 * H);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
}
function crDmy(t: number): string {
  const [y, m, rest] = crAnsi(t).split('-');
  const [d, hm] = rest.split(' ');
  return `${d}/${m}/${y} ${hm.slice(0, 5)}`;
}
const at = (days: number, hh = 23, mm = 59) => {
  const d = new Date(now - 6 * H);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days, hh, mm) + 6 * H;
};

const COURSES = [
  ['CA', 'IC4810', 'S-2-2026.SJ.IC4810.40', 'Administración de proyectos GR 40'],
  ['CA', 'IC6831', 'S-2-2026.SJ.IC6831.40', 'Aseguramiento de la calidad del software GR 40'],
  ['CA', 'IC8059', 'S-2-2026.SJ.IC8059.40', 'Introducción a los gráficos por computador GR 40'],
  ['MA', 'MA2404', 'S-2-2026.SJ.MA2404.40', 'Probabilidades GR 40'],
];
const PAST = [
  ['CA', 'IC4302', 'S-1-2026.AL.IC4302.20', 'Bases de datos II GR 20'],
  ['CA', 'IC6821', 'S-1-2026.AL.IC6821.20', 'Diseño de software GR 20'],
];

const APPS = [['Control de Plagio', '/tda-control-plagio'], ['Prematrícula', '/tda-prematricula'], ['Feria de Ideas de Negocios', '/tda-feria'], ['Expediente Estudiantil', '/tda-expediente'], ['Gestor de Inclusiones', '/tda-inclusiones'], ['Gestor de Inscripción', '/tda-inscripcion'], ['Modelo de usuario', '/tda-mu']];
const HOME = `<html><head><title>Mi portal</title></head><body>
<div id="platform_user_info"><strong>Estudiante de Ejemplo</strong><br>estudiante@estudiantec.cr</div>
<div id="menu-left"><a href="/dotlrn/">Inicio</a><a href="/dotlrn/calendar/view">Mi calendario</a><a href="/dotlrn/file-storage/#/1">Mis documentos</a><a href="/dotlrn/control-panel">Mi cuenta</a><a href="https://tecdigital.zendesk.com/hc/es/requests/new">Ayuda</a><a href="https://tecdigital.tec.ac.cr/servicios/Mapa_Campus_TEC_CA.pdf">Mapa del campus</a><a href="/register/logout">Salir</a></div>
<div id="apps-content">${APPS.map(([n, h]) => `<section class="app-box"><a href="${h}" target="_blank"><div class="app-logo"><div class="menu_item">${n}</div></div></a></section>`).join('')}</div>
<ul class="mktree"><li>Comunidades<ul id="tree-dotlrn_club"><li><a href="/dotlrn/escuela/escuela.CA/">Escuela De Ingenieria En Computacion</a><ul><li><a href="/dotlrn/escuela/escuela.CA/estudiantes.CA/">Estudiantes CA</a></li></ul></li><li><a href="/dotlrn/catedras.tec/">Cátedras</a></li></ul></li></ul>
<ul class="mktree"><li>Cursos<ul>
<li>SEMESTRE 2 2026<ul>${COURSES.map(([a, b, c, n]) => `<li><a href="/dotlrn/classes/${a}/${b}/${c}/">${n}</a></li>`).join('')}</ul></li>
<li>SEMESTRE 1 2026<ul>${PAST.map(([a, b, c, n]) => `<li><a href="/dotlrn/classes/${a}/${b}/${c}/">${n}</a></li>`).join('')}</ul></li>
</ul></li></ul></body></html>`;

interface A { name: string; due?: number; drop?: boolean; late?: boolean; sub?: string; grade?: string; desc?: string }
const assign = (id: string, a: A) => `
<div class="container_accor" assign_id="${id}">
  <div class="head_subaccord"><div><span class="assignNameText">${a.name}</span></div></div>
  <div class="content_delivery"><div class="row cnt_delivery_b">
    <div class="col-md-6">
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection">Descripción :</p><div class="body_style">${a.desc ?? 'No hay descripción para la asignación'}</div></div></div>
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection">Fecha de Entrega :</p><div class="body_style">${a.due ? crDmy(a.due) : 'Fecha no definida'}</div></div></div>
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection margin_cero">Posibilidad de entregar después de fecha límite: </p>
        <div class="body_style"><div><input type="radio" disabled ${a.late ? 'checked' : ''}><label>Sí</label></div><div><input type="radio" disabled ${a.late ? '' : 'checked'}><label>No</label></div></div></div></div>
      <div class="content_description row"><div class="col-md-12"><p class="title_subsection">Cantidad de personas por grupo:</p><div class="body_style">${a.drop ? '4' : '1'}</div></div></div>
    </div>
    <div class="col-md-6">
      ${a.drop ? `<button class="btn_send_answer" due_date="${a.due ? crAnsi(a.due) + ' GMT' : ''}">Entregar</button><div class="container_dropzone" late_submit="${a.late ? 't' : 'f'}"></div>` : ''}
      ${a.drop ? `<div class="content_description row"><p class="title_subsection">Entrega:</p><div id="data_file_${id}" class="body_style answerStyle">${a.sub ?? 'No hay entregas de archivo o enlace'}</div></div>` : ''}
      <div class="content_description row"><p class="title_subsection">Nota obtenida:</p><div class="body_style">${a.grade ?? '-- / 100'}</div></div>
    </div>
  </div></div>
</div>`;

const cat = (id: string, name: string, weight: number, earned: string, items: A[]) => `
<div id="h_${id}" class="asign_student title_acor_grade"><span class="clase" title="${name} (${weight}%)">${name} </span><div class="title_right sub_total" item_weight="${weight}">${earned}</div></div>
<div class="container_accor_detail">${items.map((a, i) => assign(`${id}${i}`, a)).join('')}</div>`;

const EVALS: Record<string, string> = {
  IC4810: [
    cat('p', 'Proyecto', 45, '10.58', [
      { name: '01 Anteproyecto', due: at(-50), drop: true, grade: '92 / 100', sub: '<a href="../../evaluation/view/ap.zip">AP_Anteproyecto.zip</a>' },
      { name: '05 Minutas de reunión', due: at(7), drop: true },
      { name: '06 Solicitud de cambio', due: at(9), drop: true },
      { name: '08 Incidencias', due: at(11), drop: true },
      { name: '14 Prototipo', due: at(3, 17, 0), drop: true, desc: '&lt;p&gt;Prototipo navegable del sistema. Ver la &lt;a href="https://example.com/rubrica.pdf"&gt;rúbrica&lt;/a&gt;.&lt;/p&gt;' },
    ]),
    cat('t', 'Tareas, quices y otros', 20, '2.00', [
      { name: 'Lab El proyecto de mi vida, parte 2', due: at(2), drop: true },
      { name: 'Quiz 3', grade: '80 / 100' },
      { name: '07 Matriz de riesgos', due: at(-5), drop: true, late: true },
    ]),
    cat('e', 'Examen 1', 15, '--', [{ name: 'Examen 1' }]),
  ].join(''),
  IC6831: [
    cat('x', 'Exámenes', 25, '11.90', [{ name: 'Examen 1', grade: '95.2 / 100' }, { name: 'Examen 2' }]),
    cat('i', 'Investigación', 15, '--', [
      { name: 'Avance 1', due: at(0, 23, 45), drop: true },
      { name: 'Avance 2', due: at(7, 23, 45), drop: true },
      { name: 'Avance 3', due: at(14, 23, 45), drop: true },
    ]),
    cat('h', 'Tareas cortas', 20, '3.13', [
      { name: 'Lecture 1', due: at(-60), drop: true, sub: '<a href="#">lectura1.wav</a>' },
      { name: 'Homework 3', drop: true },
    ]),
  ].join(''),
  IC8059: [cat('x', 'Exámenes', 40, '--', []), cat('t', 'Tareas', 40, '--', []), cat('p', 'Proyectos', 20, '--', [])].join(''),
  MA2404: [
    cat('x', 'Exámenes parciales', 75, '16.49', [{ name: 'Parcial 1', grade: '68 / 100' }]),
    cat('a', 'Asignaciones', 25, '12.86', [{ name: 'Tarea 4', due: at(5, 12, 0), drop: true }, { name: 'Tarea 1', grade: '100 / 100' }]),
  ].join(''),
};

const FOLDERS: Record<string, any> = {
  '100': { object_id: 100, name: 'Documentos', elements: [
    { object_id: 101, name: 'Apuntes', fs_type: 'folder', content_size: 3 },
    { object_id: 102, name: 'Presentaciones', fs_type: 'folder', content_size: 2 },
    { object_id: 103, name: 'Programa del curso.pdf', fs_type: 'file', mime_type: 'application/pdf', file_url: 'Programa del curso.pdf', last_modified_ansi: crAnsi(now - 70 * D), author: { name: 'Docente' } },
  ] },
  '101': { object_id: 101, name: 'Apuntes', breadcrumbs: [{ is_internal: true, title: 'Apuntes' }], elements: [
    { object_id: 111, name: 'Semana 10, gestión de riesgos.pdf', fs_type: 'file', mime_type: 'application/pdf', file_url: 'Apuntes/s10.pdf', last_modified_ansi: crAnsi(now - 2 * H), new_p: 1, author: { name: 'Docente' } },
    { object_id: 112, name: 'Plantilla de minuta.docx', fs_type: 'file', mime_type: 'application/msword', file_url: 'Apuntes/minuta.docx', last_modified_ansi: crAnsi(now - 12 * D), author: { name: 'Docente' } },
    { object_id: 113, name: 'Guía MS Project.pdf', fs_type: 'file', mime_type: 'application/pdf', file_url: 'Apuntes/guia.pdf', last_modified_ansi: crAnsi(now - 40 * D), author: { name: 'Docente' } },
  ] },
  '102': { object_id: 102, name: 'Presentaciones', breadcrumbs: [{ is_internal: true, title: 'Presentaciones' }], elements: [] },
};

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Cambio de aula para el examen</title><link>https://example.com/n1</link><pubDate>${new Date(now - 3 * D).toUTCString()}</pubDate><description>&lt;p&gt;El examen será en el aula B-12. Lleven calculadora.&lt;/p&gt;</description></item>
<item><title>Bienvenida al curso</title><link>https://example.com/n2</link><pubDate>${new Date(now - 70 * D).toUTCString()}</pubDate><description>Saludos, acá está el programa del curso.</description></item>
</channel></rss>`;

const COURSE_HOME = (code: string) => `<html><body>
<ul id="selectable_subnavbar"><li><a href="?page_num=0">Curso ${code}</a></li><li><a href="?page_num=1">Calendario</a></li><li><a href="?page_num=2">Documentos</a></li><li><a href="?page_num=3">Evaluaciones</a></li>${code === 'MA2404' ? '<li><a href="?page_num=4">GAAP</a></li>' : ''}<li><a href="?page_num=${code === 'MA2404' ? 5 : 4}">Evaluación Docente</a></li></ul>
<div class="portlet-wrapper"><div class="portlet-header"><div class="portlet-title">Noticias</div></div><div class="portlet"><p><b>Cambio de aula para el examen</b></p><p>El examen será en el aula B-12. Lleven calculadora. <a href="news/item?item_id=1">Leer más...</a></p></div></div>
${code === 'MA2404' ? '<div class="portlet-wrapper"><div class="portlet-header"><div class="portlet-title">Fechas de exámenes</div></div><div class="portlet"><table><tr><th>Parcial</th><th>Fecha</th></tr><tr><td>II</td><td>31 de octubre</td></tr><tr><td>III</td><td>28 de noviembre</td></tr></table></div></div><div class="portlet-wrapper"><div class="portlet-header"><div class="portlet-title">Horario de consulta</div></div><div class="portlet"><p>Martes 1:00 a 3:00 p. m., oficina 12.</p></div></div>' : ''}
<div class="portlet-wrapper"><div class="portlet-header"><div class="portlet-title">Equipo docente</div></div><div class="portlet">Docente:<ul><li><a href="/dotlrn/community-member?user_id=1">Persona Docente</a> (<a href="/shared/send-email?sendto=1">docente@itcr.ac.cr</a>)</li></ul><a href="members">Lista de integrantes</a></div></div>
<div class="portlet-wrapper"><div class="portlet-header"><div class="portlet-title">Subgrupos</div></div><div class="portlet"><div class="td_nocontent-portlet"><span class="nocontent-label">No hay Subgrupos</span></div></div></div>
</body></html>`;

async function route(url: string): Promise<string> {
  await sleep(250 + Math.random() * 400);
  const u = new URL(url, location.href);
  if (u.pathname.endsWith('/dotlrn/index')) return HOME;
  const code = /\/dotlrn\/classes\/[^/]+\/([^/]+)\//.exec(u.pathname)?.[1] ?? '';
  if (u.pathname.includes('/evaluation/')) return `<html><body><div id="content_assigns">${EVALS[code] ?? ''}</div></body></html>`;
  if (u.pathname.endsWith('/file-storage/')) return `<script>$rootScope.GL_FOLDER_ID = 100;</script>`;
  const f = /api\/folder\/(\d+)/.exec(u.pathname)?.[1];
  if (f) return JSON.stringify(FOLDERS[f] ?? { object_id: f, name: 'Vacía', elements: [] });
  if (u.pathname.endsWith('rss.xml')) return RSS;
  if (/^\/dotlrn\/classes\/[^/]+\/[^/]+\/[^/]+\/$/.test(u.pathname)) return COURSE_HOME(code);
  throw new Error(`demo: sin mock para ${u.pathname}`);
}

export const getText = (url: string) => route(url);
export const getDoc = async (url: string) => new DOMParser().parseFromString(await route(url), 'text/html');
export const getJson = async <T,>(url: string) => JSON.parse(await route(url)) as T;
