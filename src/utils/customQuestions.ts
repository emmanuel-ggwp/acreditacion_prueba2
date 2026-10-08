/**
 * Utilidades de preguntas personalizadas ("Sí/No + lista desplegable") por evento.
 *
 * Cubre el ciclo completo: normalizar las preguntas activas del evento
 * ({@link getCustomQuestions}), inicializar el estado del formulario
 * ({@link initCustomAnswers}), validar en cliente las obligatorias
 * ({@link missingRequiredCustom}), sanear en servidor las respuestas recibidas
 * ({@link sanitizeCustomAnswers}) y renderizar el texto para mostrar/acreditar
 * ({@link answerText}, {@link describeStoredAnswers}).
 */
// Preguntas configurables tipo "Sí/No + lista desplegable" por evento.
// Definición en Event.registrationConfig.customQuestions; respuesta en
// Participant.customData[key]. Reutilizable en las landings, el formulario de
// admin, la exportación y la vista de acreditación.

/** Definición de una pregunta personalizada del evento. */
export interface CustomQuestion {
  key: string;
  label: string;
  selectLabel?: string;
  // Mensaje aclaratorio opcional que se muestra al elegir "Sí" (ej. "Selecciona la ruta
  // que necesitas"). Guía la elección de la lista; lo escribe el organizador.
  selectHelp?: string;
  options: string[];       // vacío = pregunta solo Sí/No (sin desplegable)
  required: boolean;
  active: boolean;
  showOnAccreditation: boolean; // ¿mostrar la respuesta en la vista de acreditación?
}

/** Respuesta guardada: incluye el label para poder mostrarla sin la config. */
export interface CustomAnswer {
  label: string;
  enabled: boolean;       // Sí = true, No = false
  value: string | null;   // opción elegida (solo si enabled)
  showOnAccreditation?: boolean; // se guarda para filtrar en acreditación sin la config
}

/** Mapa de respuestas guardadas, indexado por la `key` de cada pregunta. */
export type CustomAnswers = Record<string, CustomAnswer>;

/**
 * Preguntas activas y normalizadas del evento.
 * @param registrationConfig Config de inscripción del evento; se lee `customQuestions`.
 * @returns Preguntas con `key` y `label` no vacíos y `active !== false`, con sus campos
 *   normalizados (opciones a strings, `showOnAccreditation` por defecto `true`). `[]` si no hay.
 */
export function getCustomQuestions(registrationConfig: any): CustomQuestion[] {
  const raw = registrationConfig?.customQuestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q: any) => q && q.key && q.label && q.active !== false)
    .map((q: any) => ({
      key: String(q.key),
      label: String(q.label),
      selectLabel: q.selectLabel ? String(q.selectLabel) : undefined,
      selectHelp: q.selectHelp ? String(q.selectHelp) : undefined,
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)).filter(Boolean) : [],
      required: !!q.required,
      active: q.active !== false,
      showOnAccreditation: q.showOnAccreditation !== false, // por defecto sí
    }));
}

/**
 * Estado inicial de respuestas para el formulario, desde customData existente.
 * @param questions Preguntas normalizadas del evento.
 * @param existing customData previo del participante (opcional) para precargar valores.
 * @returns Respuestas inicializadas por pregunta; el `value` previo solo se conserva si
 *   está habilitado y sigue siendo una opción válida.
 */
export function initCustomAnswers(questions: CustomQuestion[], existing?: any): CustomAnswers {
  const out: CustomAnswers = {};
  for (const q of questions) {
    const prev = existing?.[q.key];
    const enabled = !!prev?.enabled;
    const value = enabled && prev?.value && q.options.includes(String(prev.value)) ? String(prev.value) : null;
    out[q.key] = { label: q.label, enabled, value, showOnAccreditation: q.showOnAccreditation };
  }
  return out;
}

/**
 * Títulos de preguntas obligatorias sin responder (cliente).
 * @param questions Preguntas normalizadas del evento.
 * @param answers Respuestas actuales del formulario.
 * @returns Labels de las preguntas obligatorias CON opciones marcadas "Sí" pero sin opción
 *   elegida. Una pregunta solo Sí/No se cumple eligiendo "Sí"; "No" siempre es válido.
 */
export function missingRequiredCustom(questions: CustomQuestion[], answers: CustomAnswers): string[] {
  const missing: string[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    const a = answers[q.key];
    // Obligatoria e "Sí" sin opción elegida → falta. Solo aplica si la pregunta TIENE
    // lista de opciones; una pregunta solo Sí/No se cumple con elegir Sí. ("No" es válido.)
    if (q.options.length > 0 && a?.enabled && !a.value) missing.push(q.label);
  }
  return missing;
}

/**
 * Servidor: limpia/normaliza respuestas contra la config del evento.
 * @param questions Preguntas normalizadas del evento (fuente de verdad).
 * @param raw Respuestas recibidas del cliente (sin confianza).
 * @returns Respuestas saneadas por pregunta; el `value` solo se conserva si está habilitado
 *   y es una opción válida de esa pregunta.
 */
export function sanitizeCustomAnswers(questions: CustomQuestion[], raw: any): CustomAnswers {
  const out: CustomAnswers = {};
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const q of questions) {
    const a = src[q.key];
    const enabled = !!a?.enabled;
    const value = enabled && a?.value && q.options.includes(String(a.value)) ? String(a.value) : null;
    out[q.key] = { label: q.label, enabled, value, showOnAccreditation: q.showOnAccreditation };
  }
  return out;
}

/**
 * Texto legible de una respuesta: "No" | "Sí" | valor elegido.
 * @param a Respuesta a describir (puede ser `undefined`/`null`).
 * @returns "No" si no está habilitada; el valor elegido o "Sí" si lo está; `''` si no hay respuesta.
 */
export function answerText(a: CustomAnswer | undefined | null): string {
  if (!a) return '';
  return a.enabled ? (a.value || 'Sí') : 'No';
}

/**
 * Para mostrar directamente desde customData (sin necesitar la config del evento),
 * usando el label guardado en cada respuesta. Sirve para la acreditación.
 *
 * @param customData Datos personalizados guardados del participante.
 * @returns Lista `{ key, label, text }` de respuestas visibles; se omiten las marcadas con
 *   `showOnAccreditation === false` y las entradas sin campo `enabled`. `[]` si no hay datos.
 */
export function describeStoredAnswers(customData: any): { key: string; label: string; text: string }[] {
  if (!customData || typeof customData !== 'object') return [];
  const out: { key: string; label: string; text: string }[] = [];
  for (const [key, a] of Object.entries<any>(customData)) {
    if (!a || typeof a !== 'object' || !('enabled' in a)) continue;
    // Respeta el toggle "Mostrar al acreditar" guardado en la respuesta (default sí).
    if (a.showOnAccreditation === false) continue;
    out.push({ key, label: a.label || key, text: answerText(a as CustomAnswer) });
  }
  return out;
}
