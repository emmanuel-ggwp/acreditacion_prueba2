/** Adaptación exclusiva para el evento y la pregunta ya publicados de Centinela. */
export const CENTINELA_EVENT_ID = 'd2da5e1c-affb-4418-8569-e32b16e56deb';
export const CENTINELA_COMPANION_KEY = 'q_tt2xyrl';

/** null = sin respuesta válida: no inferir Sí/No ni tocar otros eventos. */
export function centinelaCompanionAnswer(eventId: unknown, customData: any): boolean | null {
  if (eventId !== CENTINELA_EVENT_ID) return null;
  const answer = customData?.[CENTINELA_COMPANION_KEY]?.enabled;
  return typeof answer === 'boolean' ? answer : null;
}

/** Solo habilitar la combinación con cargas cuando los datos ya fueron sincronizados. */
export function hasCentinelaAdultCompanion(participant: any): boolean {
  return centinelaCompanionAnswer(participant?.eventId, participant?.customData) === true &&
    participant?.guestCompanion === true && Number(participant?.guestCount) === 1 &&
    (Number(participant?.guestLoads) || 0) === 0;
}
