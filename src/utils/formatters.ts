import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { DATE_FORMATS } from './constants';

/**
 * Formats a date range in a friendly way (e.g., "Hoy de 12am a 4pm").
 * @param startDate The start date of the event.
 * @param endDate The end date of the event.
 * @returns The formatted date range string.
 */
export const formatEventDate = (startDate: string | Date, endDate: string | Date): string => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    const startTime = format(start, 'h:mm a', { locale: es });
    const endTime = format(end, 'h:mm a', { locale: es });

    if (isToday(start)) {
      return `Hoy de ${startTime} a ${endTime}`;
    }

    if (isTomorrow(start)) {
      return `Mañana de ${startTime} a ${endTime}`;
    }

    return `${format(start, 'd MMM, yyyy', { locale: es })} de ${startTime} a ${endTime}`;
  } catch (error) {
    console.error("Failed to format event date:", error);
    return 'Fecha inválida';
  }
};

/**
 * Formats a date string or Date object into a specified format.
 * @param date The date to format (string or Date).
 * @param formatString The desired output format string.
 * @returns The formatted date string.
 */
export const formatDate = (date: string | Date, formatString = DATE_FORMATS.DEFAULT): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Failed to format date:", date, error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date string or Date object into a standard date and time format.
 * @param date The date to format.
 * @returns The formatted date and time string.
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, DATE_FORMATS.DATETIME);
};

/**
 * Formato de fecha/hora PÚBLICO y DETERMINISTA: siempre locale `es-CL` y zona horaria
 * `America/Santiago`, sin depender del navegador ni del reloj del servidor. Esto asegura
 * que el render del servidor (SSR) y el del cliente coincidan carácter a carácter —lo que
 * evita el error de hidratación de React— y que las fechas siempre se muestren en la hora
 * de Chile. Devuelven '' ante una fecha inválida (para no romper el render). Úsalos en toda
 * la cara pública (landing/plantillas/chips) en vez de `toLocale*` sueltos.
 */
const CL_LOCALE = 'es-CL';
const CL_TIMEZONE = 'America/Santiago';

// Una fecha inválida NO lanza en `toLocale*` (V8 devuelve "Invalid Date"), así que se
// filtra explícitamente con isNaN para devolver '' y no mostrar "Invalid Date" en la UI.
const asValidDate = (date: string | Date): Date | null => {
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDateCL = (
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string => {
  const d = asValidDate(date);
  if (!d) return '';
  try { return d.toLocaleDateString(CL_LOCALE, { timeZone: CL_TIMEZONE, ...opts }); } catch { return ''; }
};

export const formatTimeCL = (
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string => {
  const d = asValidDate(date);
  if (!d) return '';
  try { return d.toLocaleTimeString(CL_LOCALE, { timeZone: CL_TIMEZONE, ...opts }); } catch { return ''; }
};

export const formatDateTimeCL = (
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
): string => {
  const d = asValidDate(date);
  if (!d) return '';
  try { return d.toLocaleString(CL_LOCALE, { timeZone: CL_TIMEZONE, ...opts }); } catch { return ''; }
};

/**
 * Combines first and last names into a full name.
 * @param firstName The user's first name.
 * @param lastName The user's last name.
 * @returns The full name string.
 */
export const formatName = (firstName?: string, lastName?: string): string => {
  return [firstName, lastName].filter(Boolean).join(' ');
};

/**
 * Creates a string representing capacity usage, e.g., "50 / 100".
 * @param used The number of used slots.
 * @param total The total available slots.
 * @returns A formatted capacity string. Returns 'Unlimited' if total is null/undefined.
 */
export const formatCapacity = (used: number, total?: number | null): string => {
  if (total === null || total === undefined) {
    return `${used} / Unlimited`;
  }
  return `${used} / ${total}`;
};

/**
 * Formats a number as a percentage string.
 * @param value A number between 0 and 1.
 * @returns A string with the percentage representation, e.g., "75%".
 */
export const formatPercentage = (value: number): string => {
  if (isNaN(value)) {
    return '0%';
  }
  return `${(value * 100).toFixed(0)}%`;
};

/**
 * Generates a URL-friendly slug from a string.
 * @param text The text to slugify.
 * @returns The slugified string.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Split accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};
