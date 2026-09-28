/**
 * Utilidades de color.
 *
 * Provee la conversión de un color hexadecimal a la notación `rgba()` con opacidad,
 * tolerante a entradas inválidas ({@link hexToRgba}).
 */
// Convierte un color hex (#RGB o #RRGGBB) a rgba() con la opacidad dada.
// Si el hex es inválido/ausente, cae a un negro con esa opacidad.
/**
 * Convierte un color hexadecimal a la cadena `rgba()` con la opacidad indicada.
 * Acepta formato corto `#RGB` (que expande a `#RRGGBB`) y con o sin `#`.
 * @param hex Color hexadecimal de entrada; `null`/`undefined`/inválido cae al negro.
 * @param alpha Opacidad; se acota al rango [0, 1] (valores no finitos usan 1).
 * @returns Cadena `rgba(r,g,b,a)`; ante un hex inválido, `rgba(0,0,0,<alpha>)`.
 */
export function hexToRgba(hex: string | undefined | null, alpha: number): string {
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const fallback = `rgba(0,0,0,${a})`;
  if (!hex || typeof hex !== 'string') return fallback;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return fallback;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
