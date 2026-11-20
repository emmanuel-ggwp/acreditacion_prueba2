import { Guest, GuestSchedule } from '@/models/index';
import { Op } from 'sequelize';
import { buildPublicRegistrationSummary } from '@/utils/publicRegistrationSummary';
/** Solo lectura; no cambia fechas, respuestas ni invitados de quien ya está inscrito. */
export async function loadPublicRegistrationSummary(event: any, participant: any, transaction: any) {
  try {
    const [schedules, guests] = await Promise.all([
      participant.getSchedules({ transaction }),
      Guest.findAll({ where: { participantId: participant.id }, attributes: ['id','firstName','lastName','guestType','confirmed'], transaction }),
    ]);
    const links = guests.length ? await GuestSchedule.findAll({ where: { guestId: { [Op.in]: guests.map((guest: any) => guest.id) } }, attributes: ['guestId','scheduleId'], transaction }) : [];
    const p = participant.get({ plain: true });
    return buildPublicRegistrationSummary(event, { ...p, guests, schedules }, links);
  } catch (error) {
    console.error('No se pudo obtener el resumen de la inscripción existente:', error);
    return null;
  }
}
