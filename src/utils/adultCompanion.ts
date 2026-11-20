/** Acompañante nativo por fecha. No depende de identificadores de eventos. */
export const ADULT_COMPANIONS_KEY = '_adultCompanionsBySchedule';
export function adultCompanionEnabled(config: any): boolean {
  return (config?.guests?.mode || 'named') === 'named' && config?.guests?.adultCompanionEnabled === true;
}
export function adultCompanionAnswers(customData: any): Record<string, boolean> {
  const value = customData?.[ADULT_COMPANIONS_KEY];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, answer]) => typeof answer === 'boolean')) as Record<string, boolean>;
}
export function adultCompanionForDate(customData: any, scheduleId: string): boolean | null {
  const answer = adultCompanionAnswers(customData)[scheduleId];
  return typeof answer === 'boolean' ? answer : null;
}
/** Solo agrega respuestas de fechas nuevas; preserva las anteriores y otras preguntas. */
export function addAdultCompanionDates(customData: any, scheduleIds: string[], answers: Record<string, boolean> = {}) {
  const saved = adultCompanionAnswers(customData);
  for (const id of scheduleIds) if (!Object.prototype.hasOwnProperty.call(saved, id)) saved[id] = answers[id] === true;
  return { ...(customData && typeof customData === 'object' && !Array.isArray(customData) ? customData : {}), [ADULT_COMPANIONS_KEY]: saved };
}
/** Argumentos internos constantes: nunca interpolar entradas del usuario. */
export function numericGuestsForDateSql(alias: string, schedule: string): string {
  const answer = alias + ".custom_data::jsonb -> '" + ADULT_COMPANIONS_KEY + "' -> (" + schedule + ")::text";
  return "CASE WHEN jsonb_typeof(" + answer + ") = 'boolean' THEN CASE WHEN " + answer + " = 'true'::jsonb THEN 1 ELSE 0 END ELSE COALESCE(" + alias + ".guest_count,0) END";
}
