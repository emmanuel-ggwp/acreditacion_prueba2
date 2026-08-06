// Opciones de preferencia alimenticia configurables por evento.
// Se guardan en registrationConfig.dietaryOptions como una lista de etiquetas (strings).
// El valor guardado en el participante/invitado ES la etiqueta (value === label),
// salvo datos antiguos que usan códigos (VEGETARIAN, VEGAN, ...) mapeados abajo.

export interface DietOption { value: string; label: string }

/**
 * Topes del texto libre de dieta en la interfaz (R1-03). Existen para que el freno se
 * vea ANTES de enviar: el esquema es el respaldo, no el aviso.
 *
 * `DIET_COMMENTS_MAX` — detalle del PARTICIPANTE. Va tal cual a
 * `participants.dietary_comments`, que es `VARCHAR(255)`: el tope es la columna.
 *
 * `GUEST_DIET_DETAIL_MAX` — detalle de un INVITADO. Más corto a propósito: el invitado
 * **no tiene columna de comentarios**, así que el detalle se compone como
 * `"<etiqueta>: <detalle>"` (`dietaryFull`) y viaja dentro de `dietary_preference`,
 * también `VARCHAR(255)`. Los 55 caracteres de diferencia son el margen para la
 * etiqueta, que cada evento configura y no tiene longitud predecible.
 */
export const DIET_COMMENTS_MAX = 255;
export const GUEST_DIET_DETAIL_MAX = 200;

// Lista por defecto (cuando el evento no configuró nada).
const DEFAULT_DIET: DietOption[] = [
  { value: 'VEGETARIAN', label: 'Vegetariano' },
  { value: 'VEGAN', label: 'Vegano' },
  { value: 'CELIAC', label: 'Celíaco (sin gluten)' },
  { value: 'KOSHER', label: 'Kosher' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'ALERGIA', label: 'Alergia' },
  { value: 'OTHER', label: 'Otro' },
];

// Etiquetas para los códigos antiguos (datos previos a las opciones configurables).
const LEGACY_LABELS: Record<string, string> = {
  NONE: 'Ninguna', VEGETARIAN: 'Vegetariano', VEGAN: 'Vegano',
  CELIAC: 'Celíaco (sin gluten)', KOSHER: 'Kosher', HALAL: 'Halal',
  ALERGIA: 'Alergia', OTHER: 'Otro',
};

/** Etiquetas por defecto (para precargar el editor del evento). */
export const DEFAULT_DIET_LABELS: string[] = DEFAULT_DIET.map((o) => o.label);

/**
 * Opciones del selector para un evento. Siempre incluye "Ninguna" (NONE) primero.
 * Usa las del evento si están configuradas; si no, las por defecto.
 */
export function getDietaryOptions(registrationConfig: any): DietOption[] {
  const custom = registrationConfig?.dietaryOptions;
  const base: DietOption[] = Array.isArray(custom) && custom.length
    ? custom
        .filter((s: any) => typeof s === 'string' && s.trim())
        .map((s: string) => ({ value: s.trim(), label: s.trim() }))
    : DEFAULT_DIET;
  const opts = [...base];
  // Garantiza la opción "Alergia" (texto libre) en todos los eventos, aun con opciones personalizadas.
  if (!opts.some((o) => o.value === 'ALERGIA' || /alerg/i.test(o.label))) {
    opts.push({ value: 'ALERGIA', label: 'Alergia' });
  }
  return [{ value: 'NONE', label: 'Ninguna' }, ...opts];
}

/**
 * Devuelve las opciones asegurando que el valor actual esté presente.
 * Si el valor guardado (ej. importado "Vegano" o "Sin lactosa") no coincide con
 * ninguna opción, lo agrega como su propia opción para que el <select> lo muestre.
 */
export function ensureDietOption(options: DietOption[], value: any): DietOption[] {
  const v = (value ?? '').toString().trim();
  if (!v || v === 'NONE') return options;
  if (options.some((o) => o.value === v)) return options;
  return [...options, { value: v, label: v }];
}

/**
 * ¿La opción elegida admite/necesita texto libre? (Alergia u Otro).
 * Se usa para mostrar el campo donde la persona escribe el detalle.
 */
export function isFreeTextDiet(value: any): boolean {
  if (!value) return false;
  const v = String(value).toUpperCase();
  return v === 'OTHER' || v === 'ALERGIA' || /ALERG|OTRO/.test(v);
}

/**
 * Texto completo de la dieta para mostrar/exportar: etiqueta + detalle libre.
 * Ej.: ("ALERGIA", "maní") -> "Alergia: maní". Si no hay detalle, solo la etiqueta.
 */
export function dietaryFull(pref: any, comments?: any, registrationConfig?: any): string {
  const label = dietaryLabel(pref, registrationConfig);
  const c = (comments ?? '').toString().trim();
  if (!c) return label;
  if (label.includes(c)) return label;
  return `${label}: ${c}`;
}

/**
 * Resuelve un valor guardado a su etiqueta visible.
 * Funciona sin config: las opciones personalizadas ya son su propia etiqueta,
 * y los códigos antiguos se traducen con LEGACY_LABELS.
 */
export function dietaryLabel(value: any, registrationConfig?: any): string {
  if (!value || value === 'NONE') return 'Ninguna';
  if (registrationConfig) {
    const opt = getDietaryOptions(registrationConfig).find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return LEGACY_LABELS[value] || String(value);
}
