import type { GuestMode } from './formFields';

/**
 * Arma el conteo y el texto legible de invitados según el modo del evento,
 * para el correo de confirmación (un solo campo {{guests_summary}} sirve para los 3 modos).
 * - named:     "2 (Ana Pérez, Luis Soto)"
 * - count:     "3"
 * - companion: "3 (1 acompañante + 2 cargas)"
 * - sin invitados: "Sin invitados"
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
