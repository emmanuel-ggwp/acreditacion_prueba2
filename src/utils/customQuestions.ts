// Preguntas configurables tipo "Sí/No + lista desplegable" por evento.
// Definición en Event.registrationConfig.customQuestions; respuesta en
// Participant.customData[key]. Reutilizable en las landings, el formulario de
// admin, la exportación y la vista de acreditación.

export interface CustomQuestion {
  key: string;
  label: string;
  selectLabel?: string;
  options: string[];
  required: boolean;
  active: boolean;
}

/** Respuesta guardada: incluye el label para poder mostrarla sin la config. */
export interface CustomAnswer {
  label: string;
  enabled: boolean;       // Sí = true, No = false
  value: string | null;   // opción elegida (solo si enabled)
}

export type CustomAnswers = Record<string, CustomAnswer>;

/** Preguntas activas y normalizadas del evento. */
export function getCustomQuestions(registrationConfig: any): CustomQuestion[] {
  const raw = registrationConfig?.customQuestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q: any) => q && q.key && q.label && q.active !== false)
    .map((q: any) => ({
      key: String(q.key),
      label: String(q.label),
      selectLabel: q.selectLabel ? String(q.selectLabel) : undefined,
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)).filter(Boolean) : [],
      required: !!q.required,
      active: q.active !== false,
    }));
}

/** Estado inicial de respuestas para el formulario, desde customData existente. */
export function initCustomAnswers(questions: CustomQuestion[], existing?: any): CustomAnswers {
  const out: CustomAnswers = {};
  for (const q of questions) {
    const prev = existing?.[q.key];
    const enabled = !!prev?.enabled;
    const value = enabled && prev?.value && q.options.includes(String(prev.value)) ? String(prev.value) : null;
    out[q.key] = { label: q.label, enabled, value };
  }
  return out;
}

/** Títulos de preguntas obligatorias sin responder (cliente). */
export function missingRequiredCustom(questions: CustomQuestion[], answers: CustomAnswers): string[] {
  const missing: string[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    const a = answers[q.key];
    // Obligatoria e "Sí" sin opción elegida → falta. ("No" es una respuesta válida.)
    if (a?.enabled && !a.value) missing.push(q.label);
  }
  return missing;
}

/** Servidor: limpia/normaliza respuestas contra la config del evento. */
export function sanitizeCustomAnswers(questions: CustomQuestion[], raw: any): CustomAnswers {
  const out: CustomAnswers = {};
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const q of questions) {
    const a = src[q.key];
    const enabled = !!a?.enabled;
    const value = enabled && a?.value && q.options.includes(String(a.value)) ? String(a.value) : null;
    out[q.key] = { label: q.label, enabled, value };
  }
  return out;
}

/** Texto legible de una respuesta: "No" | "Sí" | valor elegido. */
export function answerText(a: CustomAnswer | undefined | null): string {
  if (!a) return '';
  return a.enabled ? (a.value || 'Sí') : 'No';
}

/**
 * Para mostrar directamente desde customData (sin necesitar la config del evento),
 * usando el label guardado en cada respuesta. Sirve para la acreditación.
 */
export function describeStoredAnswers(customData: any): { key: string; label: string; text: string }[] {
  if (!customData || typeof customData !== 'object') return [];
  const out: { key: string; label: string; text: string }[] = [];
  for (const [key, a] of Object.entries<any>(customData)) {
    if (!a || typeof a !== 'object' || !('enabled' in a)) continue;
    out.push({ key, label: a.label || key, text: answerText(a as CustomAnswer) });
  }
  return out;
}
