import { clean } from './util';
import { sanitize } from './sanitize';

export interface CourseTab {
  label: string;
  /** URL que da el sitio (normalmente `?page_num=N`). */
  href: string;
  /** Si TEC Vegetal tiene vista propia para esta pestaña. */
  native: 'resumen' | 'evals' | 'docs' | null;
}

export interface Portlet { title: string; html: string; empty: boolean }

export interface CourseHome { tabs: CourseTab[]; portlets: Portlet[] }

/**
 * Portada del curso: pestañas (cambian según el curso, ej. Probabilidades tiene
 * "GAAP") y portlets (cada profe agrega los suyos: horarios, fechas de examen…).
 */
export function parseCourseHome(doc: Document, pageUrl: string): CourseHome {
  const tabs: CourseTab[] = [...doc.querySelectorAll('#selectable_subnavbar a[href]')].map((a, i) => {
    const label = clean(a.textContent);
    const href = new URL(a.getAttribute('href') ?? '', pageUrl).href;
    const native = i === 0 ? 'resumen' : /^documentos$/i.test(label) ? 'docs' : /^evaluaciones$/i.test(label) ? 'evals' : null;
    return { label: i === 0 ? 'Resumen' : label, href, native };
  });

  const portlets: Portlet[] = [...doc.querySelectorAll('.portlet-wrapper')].map((w) => {
    const title = clean(w.querySelector('.portlet-title')?.textContent);
    const body = w.querySelector('.portlet');
    const empty = !body || !!body.querySelector('.td_nocontent-portlet, .nocontent-portlet');
    return { title, html: body && !empty ? sanitize(body, pageUrl) : '', empty };
  }).filter((p) => p.title);

  return { tabs, portlets };
}
