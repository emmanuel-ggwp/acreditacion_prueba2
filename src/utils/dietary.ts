/**
 * Utilidades de preferencia alimenticia (dieta) configurable por evento.
 *
 * Resuelve la lista de opciones del selector ({@link getDietaryOptions},
 * {@link ensureDietOption}), decide si una opción requiere texto libre
 * ({@link isFreeTextDiet}) y compone la etiqueta visible y el texto completo para
 * mostrar/exportar ({@link dietaryLabel}, {@link dietaryFull}). Soporta tanto las
 * etiquetas configuradas por el organizador (value === label) como los códigos antiguos
 * (VEGETARIAN, VEGAN, ...) traducidos con un mapa de compatibilidad.
 */
// Opciones de preferencia alimenticia configurables por evento.
// Se guardan en registrationConfig.dietaryOptions como una lista de etiquetas (strings).
// El valor guardado en el participante/invitado ES la etiqueta (value === label),
// salvo datos antiguos que usan códigos (VEGETARIAN, VEGAN, ...) mapeados abajo.

/** Opción de dieta del selector: `value` es el valor guardado y `label` el texto visible. */
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
 *
 * @param registrationConfig Config de inscripción del evento; se leen sus `dietaryOptions`
 *   (lista de strings). Con lista propia se respeta EXACTAMENTE (no se fuerza "Alergia").
 * @returns Lista de opciones con "Ninguna" al inicio, seguida de las del evento o las por defecto.
 */
export function getDietaryOptions(registrationConfig: any): DietOption[] {
  const custom = registrationConfig?.dietaryOptions;
  const cleaned: DietOption[] = Array.isArray(custom)
    ? custom
        .filter((s: any) => typeof s === 'string' && s.trim())
        .map((s: string) => ({ value: s.trim(), label: s.trim() }))
    : [];
  // Con opciones PERSONALIZADAS se respeta EXACTAMENTE la lista del organizador: si no
  // incluyó "Alergia", NO se agrega (antes se forzaba en todos los eventos, así que
  // aparecía aunque no se hubiera seleccionado). Sin lista propia, se usan las opciones
  // por defecto (que ya incluyen Alergia).
  const base: DietOption[] = cleaned.length ? cleaned : DEFAULT_DIET;
  return [{ value: 'NONE', label: 'Ninguna' }, ...base];
}

/**
 * Devuelve las opciones asegurando que el valor actual esté presente.
 * Si el valor guardado (ej. importado "Vegano" o "Sin lactosa") no coincide con
 * ninguna opción, lo agrega como su propia opción para que el <select> lo muestre.
 *
 * @param options Opciones base del selector.
 * @param value Valor actualmente guardado (cualquier tipo; se normaliza a string).
 * @returns Las mismas opciones, o una copia con el valor agregado si faltaba. Los valores
 *   vacíos o `NONE` no agregan nada.
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
 *
 * @param value Valor de dieta elegido (cualquier tipo; se compara en mayúsculas).
 * @returns `true` si la opción es "Otro"/"Alergia" (o contiene ALERG/OTRO); `false` si no.
 */
export function isFreeTextDiet(value: any): boolean {
  if (!value) return false;
  const v = String(value).toUpperCase();
  return v === 'OTHER' || v === 'ALERGIA' || /ALERG|OTRO/.test(v);
}

/**
 * Texto completo de la dieta para mostrar/exportar: etiqueta + detalle libre.
 * Ej.: ("ALERGIA", "maní") -> "Alergia: maní". Si no hay detalle, solo la etiqueta.
 *
 * @param pref Valor de preferencia guardado (código o etiqueta).
 * @param comments Detalle libre opcional (ej. "maní"). Vacío o ya contenido en la etiqueta se omite.
 * @param registrationConfig Config de inscripción opcional para resolver la etiqueta visible.
 * @returns "<etiqueta>: <detalle>", o solo la etiqueta si no hay detalle.
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
 *
 * @param value Valor guardado (código antiguo o etiqueta). Vacío o `NONE` devuelve "Ninguna".
 * @param registrationConfig Config de inscripción opcional; si se pasa, se busca la etiqueta en sus opciones.
 * @returns La etiqueta visible; si no se encuentra, el mapa de compatibilidad o el propio valor.
 */
export function dietaryLabel(value: any, registrationConfig?: any): string {
  if (!value || value === 'NONE') return 'Ninguna';
  if (registrationConfig) {
    const opt = getDietaryOptions(registrationConfig).find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return LEGACY_LABELS[value] || String(value);
}
