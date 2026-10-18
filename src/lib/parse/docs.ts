import { parseAnsiCR } from '../dates';
import type { DocItem, DocKind, Folder } from '../types';
import { clean } from './util';

/** El shell de Angular de Documentos trae `$rootScope.GL_FOLDER_ID = 245829280;`. */
export function parseRootFolderId(html: string): string | null {
  return /GL_FOLDER_ID\s*=\s*['"]?(\d+)/.exec(html)?.[1] ?? null;
}

type Raw = Record<string, any>;

function kindOf(e: Raw): DocKind {
  const t = String(e.fs_type ?? e.type ?? '').toLowerCase();
  if (t === 'folder') return 'folder';
  if (t === 'url' || t === 'link' || (e.url && /^https?:/i.test(e.url) && !e.mime_type)) return 'url';
  return 'file';
}

export function parseFolder(json: Raw, courseBase: string): Folder {
  const items: DocItem[] = (Array.isArray(json.elements) ? json.elements : []).map((e: Raw): DocItem => {
    const kind = kindOf(e);
    let href: string | null = null;
    if (kind === 'file' && e.file_url) href = `${courseBase}file-storage/view/${encodeURIComponent(String(e.file_url))}`;
    else if (kind === 'url') href = String(e.url || e.file_url || '') || null;
    return {
      id: String(e.object_id),
      name: clean(e.name || e.title || e.file_upload_name),
      kind,
      mime: String(e.mime_type ?? ''),
      count: kind === 'folder' ? Number(e.content_size ?? 0) : null,
      modified: parseAnsiCR(e.last_modified_ansi),
      isNew: String(e.new_p) === '1',
      author: clean(e.author?.name),
      href,
    };
  });
  // Carpetas primero, luego por nombre.
  items.sort((a, b) => (a.kind === 'folder' ? 0 : 1) - (b.kind === 'folder' ? 0 : 1) || a.name.localeCompare(b.name, 'es', { numeric: true }));

  // Los breadcrumbs de la API no traen IDs de carpetas internas, solo títulos.
  // La UI arma el camino con el mapa padre→hijo que se va guardando al navegar.
  const path = (Array.isArray(json.breadcrumbs) ? json.breadcrumbs : [])
    .filter((c: Raw) => c.is_internal)
    .map((c: Raw) => clean(c.title ?? c.name));

  return {
    id: String(json.object_id),
    name: clean(json.name || json.title),
    modified: parseAnsiCR(json.last_modified_ansi),
    path,
    items,
  };
}
