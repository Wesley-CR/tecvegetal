export interface Course {
  /** Segmento único del path, ej. "S-2-2026.SJ.IC6831.40". */
  id: string;
  dept: string;
  code: string;
  /** "S-2-2026" */
  period: string;
  campus: string;
  group: string;
  /** Nombre sin "GR 40". */
  name: string;
  /** "/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/" */
  base: string;
}

export interface CoursesData {
  current: Course[];
  currentLabel: string;
  past: { label: string; courses: Course[] }[];
  /** Apps, comunidades y menú de cuenta del inicio clásico (puede faltar en cachés viejos). */
  portal?: import('./parse/portal').Portal;
}

export interface Link { text: string; href: string }

export interface Assignment {
  id: string;
  name: string;
  dueAt: number | null;
  dueText: string;
  lateAllowed: boolean;
  /** La página muestra el widget de entrega (no implica que esté abierta). */
  canSubmit: boolean;
  submitted: boolean;
  submissionText: string;
  submissionLinks: Link[];
  grade: number | null;
  outOf: number | null;
  weighted: number | null;
  description: string;
  links: Link[];
  value: string;
  groupSize: string;
}

export interface Category {
  id: string;
  name: string;
  weight: number | null;
  earned: number | null;
  assignments: Assignment[];
}

export interface EvalsData {
  categories: Category[];
  total: number | null;
  totalOf: number | null;
}

export type DocKind = 'folder' | 'file' | 'url';

export interface DocItem {
  id: string;
  name: string;
  kind: DocKind;
  mime: string;
  /** Archivos dentro (solo carpetas). */
  count: number | null;
  modified: number | null;
  isNew: boolean;
  author: string;
  href: string | null;
}

export interface Folder {
  id: string;
  name: string;
  modified: number | null;
  /** Nombres de las carpetas internas desde la raíz (sin IDs: la API no los da). */
  path: string[];
  items: DocItem[];
}

