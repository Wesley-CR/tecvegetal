import { VERSION } from './fatal';

// Solo en la versión de Chrome: como no está en la Chrome Web Store, no se
// actualiza sola. Una vez cada 12 h se le pregunta a GitHub cuál es el último
// release y, si es más nuevo, la barra de arriba avisa. (Firefox se actualiza
// solo desde addons.mozilla.org, así que ahí esto ni se compila.)

export const REPO = 'Wesley-CR/tecvegetal';
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const KEY = 'tecvegetal:update';
const EVERY = 12 * 3600_000;

export const update = $state<{ latest: string | null }>({ latest: null });

/** -1 si a < b, 0 si iguales, 1 si a > b ("1.10.0" > "1.9.2"). */
export function cmpVersion(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function show(latest: string | null) {
  update.latest = latest && cmpVersion(latest, VERSION) > 0 ? latest.replace(/^v/, '') : null;
}

export async function checkForUpdate(): Promise<void> {
  if (!import.meta.env.CHROME) return;
  let cached: { at: number; latest: string | null } | null = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { /* nada */ }
  if (cached) show(cached.latest);
  if (cached && Date.now() - cached.at < EVERY) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!r.ok) return;
    const j = (await r.json()) as { tag_name?: string };
    const latest = j.tag_name ?? null;
    try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), latest })); } catch { /* nada */ }
    show(latest);
  } catch {
    // Sin red o GitHub caído: se intenta la próxima vez.
  }
}
