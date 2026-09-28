/**
 * Utilidades de invitados para el correo de confirmación.
 *
 * Compone el texto legible de invitados a partir de los tres modos del evento
 * ({@link buildGuestSummary}) y el desglose de "detalle de asistencia" cuando hay
 * invitados distintos por fecha ({@link buildAttendanceDetail}). El resultado alimenta
 * las variables de plantilla `{{guests_summary}}` y `{{detalle_asistencia}}`.
 */
import type { GuestMode } from './formFields';

/**
 * Arma el conteo y el texto legible de invitados según el modo del evento,
 * para el correo de confirmación (un solo campo {{guests_summary}} sirve para los 3 modos).
 * - named:     "2 (Ana Pérez, Luis Soto)"
 * - count:     "3"
 * - companion: "3 (1 acompañante + 2 cargas)"
 * - sin invitados: "Sin invitados"
 *
 * @param mode Modo de declaración de invitados del evento (`named` | `count` | `companion`).
 * @param opts Datos según el modo: `names` (modo named), `count` (modo count),
 *   `companion` y `loads` (modo companion). Valores negativos se acotan a 0 y los
 *   nombres vacíos se descartan.
 * @returns Objeto con `count` (total de invitados) y `summary` (texto listo para el correo).
 */
export function buildGuestSummary(
  mode: GuestMode,
  opts: { names?: string[]; count?: number; companion?: boolean; loads?: number }
): { count: number; summary: string } {
  if (mode === 'count') {
    const n = Math.max(0, opts.count || 0);
    return { count: n, summary: n > 0 ? String(n) : 'Sin invitados' };
  }
  if (mode === 'companion') {
    const c = opts.companion ? 1 : 0;
    const l = Math.max(0, opts.loads || 0);
    const total = c + l;
    const parts: string[] = [];
    if (c) parts.push('1 acompañante');
    if (l) parts.push(`${l} carga${l === 1 ? '' : 's'}`);
    return { count: total, summary: total > 0 ? `${total} (${parts.join(' + ')})` : 'Sin invitados' };
  }
  // named
  const names = (opts.names || []).map((n) => (n || '').trim()).filter(Boolean);
  return { count: names.length, summary: names.length ? `${names.length} (${names.join(', ')})` : 'Sin invitados' };
}

/**
 * Una fecha/función a la que asiste el titular, con sus datos ya listos para el correo.
 * Se usa como entrada de {@link buildAttendanceDetail}.
 */
export interface AttendanceDate {
  /** Nombre de la función/fecha (ej. "Función de Gala"). */
  name?: string | null;
  /** Fecha ya formateada para el correo (ej. "vie 25 de septiembre, 20:00"). */
  when?: string | null;
  /** Lugar (opcional). */
  location?: string | null;
  /** Nombres de los invitados de ESA fecha (sin el titular). */
  guestNames?: string[];
}

/**
 * Arma el texto de "detalle de asistencia" para el correo de confirmación (variable
 * {{detalle_asistencia}}), pensado para "invitados distintos por fecha":
 *  - UNA sola fecha  → formato simple (Fecha / Lugar / Invitados), SIN estructura por fecha.
 *  - VARIAS fechas   → desglose: cada fecha con su lugar y SUS invitados.
 *
 * Devuelve texto con saltos de línea (\n). En la plantilla, colocar {{detalle_asistencia}}
 * dentro de un bloque con `white-space: pre-line` para que los saltos se rendericen.
 *
 * @param dates Lista de fechas de asistencia; los elementos nulos se ignoran.
 * @returns Texto multilínea: formato simple si hay 0-1 fechas, o desglose por fecha si
 *   hay varias. Devuelve `''` si no hay ninguna fecha.
 */
export function buildAttendanceDetail(dates: AttendanceDate[]): string {
  const list = (dates || []).filter(Boolean);
  const guestsLine = (names?: string[]) => {
    const clean = (names || []).map((n) => (n || '').trim()).filter(Boolean);
    return clean.length ? `Invitados: ${clean.join(', ')}` : 'Sin invitados';
  };

  if (list.length <= 1) {
    const d = list[0];
    if (!d) return '';
    const lines: string[] = [];
    if (d.when) lines.push(`Fecha: ${d.when}`);
    if (d.location) lines.push(`Lugar: ${d.location}`);
    lines.push(guestsLine(d.guestNames));
    return lines.join('\n');
  }

  const blocks = list.map((d) => {
    const head = [d.name, d.when].map((x) => (x || '').trim()).filter(Boolean).join(' — ');
    const place = d.location ? ` · ${d.location}` : '';
    return `• ${head}${place}\n  ${guestsLine(d.guestNames)}`;
  });
  return `Estás inscrito en ${list.length} fechas:\n\n${blocks.join('\n\n')}`;
}
