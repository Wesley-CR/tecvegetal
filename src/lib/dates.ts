// TEC Digital escribe todas las fechas en hora de Costa Rica (UTC-6, sin horario
// de verano), incluso el atributo `due_date` que dice "GMT". Todo se normaliza a
// epoch ms acá; el resto de la app nunca parsea fechas por su cuenta.

const CR_OFFSET_MS = 6 * 3600_000;
export const TZ = 'America/Costa_Rica';

export function crToEpoch(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number {
  return Date.UTC(y, mo - 1, d, h, mi, s) + CR_OFFSET_MS;
}

/** "2026-10-16 23:45:00 GMT" o "2026-07-20 20:45:31" (ANSI de la API de documentos). */
export function parseAnsiCR(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  return crToEpoch(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0));
}

/** "16/10/2026 23:45" o "Fecha no definida". */
export function parseDmyCR(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  return crToEpoch(+m[3], +m[2], +m[1], +(m[4] ?? 23), +(m[5] ?? 59));
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Día calendario en CR, como número comparable (yyyymmdd). */
export function crDayKey(t: number): number {
  const d = new Date(t - CR_OFFSET_MS);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** Medianoche CR del día que contiene t. */
export function crStartOfDay(t: number): number {
  const d = new Date(t - CR_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + CR_OFFSET_MS;
}

const timeFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const weekdayFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, weekday: 'long' });
const shortFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, day: 'numeric', month: 'short' });
const fullFmt = new Intl.DateTimeFormat('es-CR', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});

export const fmtTime = (t: number) => timeFmt.format(t);
export const fmtShort = (t: number) => shortFmt.format(t).replace('.', '');
export const fmtFull = (t: number) => fullFmt.format(t).replace(/\./g, '');
export const fmtWeekday = (t: number) => weekdayFmt.format(t);

/** "hoy 23:45", "mañana 17:00", "jueves 23:59", "23 oct". */
export function fmtWhen(t: number, now: number): string {
  const days = (crStartOfDay(t) - crStartOfDay(now)) / DAY;
  if (days === 0) return `hoy ${fmtTime(t)}`;
  if (days === 1) return `mañana ${fmtTime(t)}`;
  if (days === -1) return `ayer ${fmtTime(t)}`;
  if (days > 1 && days < 7) return `${fmtWeekday(t)} ${fmtTime(t)}`;
  return `${fmtShort(t)} ${fmtTime(t)}`;
}

/** "en 51 min", "en 3 h", "en 4 días", "hace 2 días". */
export function fmtRelative(t: number, now: number): string {
  const diff = t - now;
  const abs = Math.abs(diff);
  let s: string;
  if (abs < HOUR) s = `${Math.max(1, Math.round(abs / MIN))} min`;
  else if (abs < 36 * HOUR) s = `${Math.round(abs / HOUR)} h`;
  else s = `${Math.round(abs / DAY)} días`;
  return diff >= 0 ? `en ${s}` : `hace ${s}`;
}

export type Urgency = 'now' | 'soon' | 'week' | 'later' | 'none';

export function urgency(t: number | null, now: number): Urgency {
  if (t == null) return 'none';
  const d = t - now;
  if (d < DAY) return 'now';
  if (d < 3 * DAY) return 'soon';
  if (d < 7 * DAY) return 'week';
  return 'later';
}

export { MIN, HOUR, DAY };
