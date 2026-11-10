import { sequelize } from '@/lib/sequelize';
import { Participant, Event, EventSchedule, Accreditation, TicketDelivery } from '@/models/index';
import { getTicketLimit } from '@/utils/tickets';
import { auditLogService } from './auditLogService';

export class TicketError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TicketService {
  async getStatus(participantId: string, scheduleId: string) {
    const participant = await Participant.findByPk(participantId);
    if (!participant) throw new TicketError('Participante no encontrado.', 404);
    const schedule = await EventSchedule.findOne({ where: { id: scheduleId, eventId: participant.eventId } });
    if (!schedule) throw new TicketError('La fecha no pertenece al evento del participante.', 404);
    const event = await Event.findByPk(participant.eventId!);
    if (!event) throw new TicketError('Evento no encontrado.', 404);
    const delivery = await TicketDelivery.findOne({ where: { participantId } });
    const accreditation = await Accreditation.findOne({ where: { participantId, eventScheduleId: scheduleId } });
    return { maxPerParticipant: getTicketLimit(event.registrationConfig), isAccredited: !!accreditation, delivery };
  }

  async deliver(participantId: string, scheduleId: string, quantity: number, userId: string) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw new TicketError('La cantidad de tickets debe ser un entero positivo de hasta 10000.');
    }
    const result = await sequelize.transaction(async (transaction) => {
      // Mismo bloqueo que la acreditación. Serializa dos puestos o solicitudes simultáneas.
      const schedule = await EventSchedule.findByPk(scheduleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!schedule) throw new TicketError('Fecha no encontrada.', 404);
      const event = await Event.findByPk(schedule.eventId, { transaction, lock: transaction.LOCK.SHARE });
      if (!event || !event.isActive || !schedule.isActive || schedule.status === 'cancelled') {
        throw new TicketError('El evento o la fecha no están activos.');
      }
      const participant = await Participant.findByPk(participantId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!participant || participant.eventId !== event.id) {
        throw new TicketError('El participante no pertenece al evento de esta fecha.', 404);
      }
      const existing = await TicketDelivery.findOne({ where: { participantId }, transaction });
      if (existing) throw new TicketError('Este participante ya recibió sus tickets en este evento.', 409);
      const max = getTicketLimit(event.registrationConfig);
      if (!max) throw new TicketError('La entrega de tickets no está habilitada en este evento.');
      if (quantity > max) throw new TicketError(`El máximo por participante es ${max} tickets.`);
      const accreditation = await Accreditation.findOne({ where: { participantId, eventScheduleId: scheduleId }, transaction });
      if (!accreditation) throw new TicketError('Primero debes acreditar al participante en esta fecha.');
      const delivery = await TicketDelivery.create({ participantId, scheduleId, quantity, deliveredBy: userId, deliveredAt: new Date() }, { transaction });
      return { delivery, eventId: event.id, name: `${participant.firstName} ${participant.lastName}`.trim() };
    });
    await auditLogService.log({
      userId, action: 'CREATE', entity: 'TicketDelivery', entityId: result.delivery.id, eventId: result.eventId,
      details: { name: result.name, summary: `${quantity} ticket(s) entregados`, participantId, scheduleId, quantity },
    });
    return result.delivery;
  }
}

export const ticketService = new TicketService();
