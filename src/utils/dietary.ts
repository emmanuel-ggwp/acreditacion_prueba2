// Opciones de preferencia alimenticia configurables por evento.
// Se guardan en registrationConfig.dietaryOptions como una lista de etiquetas (strings).
// El valor guardado en el participante/invitado ES la etiqueta (value === label),
// salvo datos antiguos que usan códigos (VEGETARIAN, VEGAN, ...) mapeados abajo.

export interface DietOption { value: string; label: string }

// Lista por defecto (cuando el evento no configuró nada).
const DEFAULT_DIET: DietOption[] = [
  { value: 'VEGETARIAN', label: 'Vegetariano' },
  { value: 'VEGAN', label: 'Vegano' },
  { value: 'CELIAC', label: 'Celíaco (sin gluten)' },
  { value: 'KOSHER', label: 'Kosher' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'OTHER', label: 'Otro' },
];

// Etiquetas para los códigos antiguos (datos previos a las opciones configurables).
const LEGACY_LABELS: Record<string, string> = {
  NONE: 'Ninguna', VEGETARIAN: 'Vegetariano', VEGAN: 'Vegano',
  CELIAC: 'Celíaco (sin gluten)', KOSHER: 'Kosher', HALAL: 'Halal', OTHER: 'Otro',
};

/** Etiquetas por defecto (para precargar el editor del evento). */
export const DEFAULT_DIET_LABELS: string[] = DEFAULT_DIET.map((o) => o.label);

/**
 * Opciones del selector para un evento. Siempre incluye "Ninguna" (NONE) primero.
 * Usa las del evento si están configuradas; si no, las por defecto.
 */
export function getDietaryOptions(registrationConfig: any): DietOption[] {
  const custom = registrationConfig?.dietaryOptions;
  const opts: DietOption[] = Array.isArray(custom) && custom.length
    ? custom
        .filter((s: any) => typeof s === 'string' && s.trim())
        .map((s: string) => ({ value: s.trim(), label: s.trim() }))
    : DEFAULT_DIET;
  return [{ value: 'NONE', label: 'Ninguna' }, ...opts];
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
