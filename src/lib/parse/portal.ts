import type { Link } from '../types';
import { clean, textWithoutIcons } from './util';

export interface App { name: string; href: string; icon: string | null }
export interface Community { name: string; href: string; depth: number }
export interface Portal {
  user: { name: string; email: string } | null;
  apps: App[];
  communities: Community[];
  /** Menú de cuenta del sitio (calendario, mis documentos, mi cuenta, ayuda…), sin "Inicio". */
  menu: Link[];
  logout: string | null;
}

/**
 * Todo lo que el inicio clásico ofrece aparte de los cursos. Se lee del HTML,
 * no se hardcodea: si TEC Digital agrega una app o un link, aparece solo.
 */
export function parsePortal(doc: Document, pageUrl: string): Portal {
  const abs = (h: string | null) => { try { return new URL(h ?? '', pageUrl).href; } catch { return ''; } };

  const apps: App[] = [];
  const seenApps = new Set<string>();
  for (const a of doc.querySelectorAll('section.app-box a[href]')) {
    const href = abs(a.getAttribute('href'));
    if (!href || seenApps.has(href)) continue;
    seenApps.add(href);
    const img = a.querySelector('img');
    apps.push({
      name: clean(a.querySelector('.menu_item')?.textContent ?? a.textContent),
      href,
      icon: img ? abs(img.getAttribute('src')) : null,
    });
  }

  const communities: Community[] = [];
  const tree = doc.querySelector('#tree-dotlrn_club');
  if (tree) {
    for (const a of tree.querySelectorAll('a[href]')) {
      let depth = 0;
      for (let el = a.parentElement; el && el !== tree; el = el.parentElement) if (el.tagName === 'UL') depth++;
      communities.push({ name: textWithoutIcons(a), href: abs(a.getAttribute('href')), depth });
    }
  }

  const menu: Link[] = [];
  const seenMenu = new Set<string>();
  let logout: string | null = null;
  for (const a of doc.querySelectorAll('#menu-left a[href], #main-menu-td a[href]')) {
    const href = abs(a.getAttribute('href'));
    const text = textWithoutIcons(a);
    if (!href || !text) continue;
    if (/\/register\/logout/.test(href)) { logout = href; continue; }
    if (/^inicio$/i.test(text) || seenMenu.has(href)) continue;
    seenMenu.add(href);
    menu.push({ text, href });
  }

  const info = doc.querySelector('#platform_user_info');
  const name = clean(info?.querySelector('strong')?.textContent);
  const email = clean(info?.textContent).replace(name, '').trim();

  return { user: name ? { name, email } : null, apps, communities, menu, logout };
}
