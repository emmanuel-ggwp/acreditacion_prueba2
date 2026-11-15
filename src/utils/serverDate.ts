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

/** Primer instante real de un día local, incluso si el cambio de hora elimina las 00:00. */
function startOfLocalDay(calendarDayUtc: number): Date {
  // La fecha local es monótona a través de las transiciones de Chile. Buscar sus
  // límites evita asumir días de 24 h y resuelve tanto horas omitidas como repetidas.
  let low = Math.floor((calendarDayUtc - 2 * 86400000) / 1000);
  let high = Math.floor((calendarDayUtc + 2 * 86400000) / 1000);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const parts = clParts(new Date(middle * 1000));
    const localDay = Date.UTC(+parts.yyyy, +parts.MM - 1, +parts.dd);
    if (localDay < calendarDayUtc) low = middle + 1;
    else high = middle;
  }
  return new Date(low * 1000);
}

/** Rango [inicio, fin) del día de Chile: puede durar 23, 24 o 25 horas. */
export function clDayRange(ref: Date = new Date()): { start: Date; end: Date } {
  const parts = clParts(ref);
  const day = Date.UTC(+parts.yyyy, +parts.MM - 1, +parts.dd);
  const nextDay = Date.UTC(+parts.yyyy, +parts.MM - 1, +parts.dd + 1);
  return { start: startOfLocalDay(day), end: startOfLocalDay(nextDay) };
}
