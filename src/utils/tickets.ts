// Eventos existentes sin configuración conservan la entrega de tickets desactivada.
export const getTicketLimit = (config: any): number => {
  const limit = config?.tickets?.maxPerParticipant;
  return Number.isSafeInteger(limit) && limit > 0 && limit <= 10000 ? limit : 0;
};
