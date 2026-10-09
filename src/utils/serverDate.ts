/**
 * Utilidades de fecha en zona de Chile (America/Santiago) para CÓDIGO DE SERVIDOR.
 *
 * El servidor de producción corre en UTC, y tanto date-fns (`format`, `startOfDay`,
 * `endOfDay`, …) como los getters locales de `Date` (`getHours`, `setHours`, …) usan la
 * TZ del PROCESO. Por eso, para calcular "hoy", rangos de día u horas en el servidor hay
 * que FORZAR Santiago. Se hace con `Intl` (sin depender de la TZ del proceso ni de
 * dependencias extra). En el CLIENTE use `src/utils/formatters.ts` (formatDateCL/…).
 */
const CL_TZ = 'America/Santiago';

/** Componentes de fecha/hora (como strings de 2+ dígitos) de `d` en America/Santiago. */
export function clParts(d: Date): { yyyy: string; MM: string; dd: string; HH: string; mm: string; ss: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
  let HH = g('hour');
  if (HH === '24') HH = '00'; // algunos runtimes devuelven '24' para medianoche
  return { yyyy: g('year'), MM: g('month'), dd: g('day'), HH, mm: g('minute'), ss: g('second') };
}

/**
 * Rango `[inicio, fin)` del día que contiene `ref` en America/Santiago, como instantes UTC.
 * Úselo con `{ [Op.gte]: inicio, [Op.lt]: fin }` para filtrar "ese día en Chile".
 *
 * (El offset se toma en `ref`; en los ~2 días de cambio de horario de verano podría
 * desviarse 1 h respecto del cambio exacto a las 00:00, lo que es tolerable para conteos.)
 */
export function clDayRange(ref: Date = new Date()): { start: Date; end: Date } {
  const t = clParts(ref);
  // Hora de pared de Chile interpretada como UTC, menos el instante real = offset de Chile.
  const wallAsUtc = Date.UTC(+t.yyyy, +t.MM - 1, +t.dd, +t.HH, +t.mm, +t.ss);
  const offsetMs = wallAsUtc - ref.getTime();
  // Inicio del día de Chile (00:00) como instante UTC = (00:00 de pared como UTC) − offset.
  const startMs = Date.UTC(+t.yyyy, +t.MM - 1, +t.dd, 0, 0, 0) - offsetMs;
  return { start: new Date(startMs), end: new Date(startMs + 86400000) };
}
