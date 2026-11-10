import { Op } from 'sequelize';
import { Accreditation, EventSchedule, Participant, Guest } from '@/models/index';

export class AttendanceHistoryError extends Error {
  constructor(message: string, public statusCode = 404) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AttendanceHistoryService {
  // Lectura informativa independiente del check-in: nunca participa en sus validaciones.
  async getHistory(type: 'participant' | 'guest', id: string, scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new AttendanceHistoryError('Fecha no encontrada.');
    let participant;
    if (type === 'participant') {
      participant = await Participant.findByPk(id);
    } else {
      const guest = await Guest.findByPk(id);
      if (!guest) throw new AttendanceHistoryError('Invitado no encontrado.');
      participant = await Participant.findByPk(guest.participantId);
    }
    if (!participant || participant.eventId !== schedule.eventId) {
      throw new AttendanceHistoryError('La persona no pertenece al evento de esta fecha.');
    }
    const records = await Accreditation.findAll({
      where: {
        [type === 'participant' ? 'participantId' : 'guestId']: id,
        eventScheduleId: { [Op.ne]: scheduleId },
      },
      attributes: ['id', 'eventScheduleId', 'checkInTime'],
      include: [{
        model: EventSchedule, required: true, where: { eventId: schedule.eventId },
        attributes: ['id', 'label', 'scheduleName', 'startDateTime'],
      }],
      order: [['checkInTime', 'DESC'], ['id', 'ASC']],
    });
    return records.map((record) => {
      const plain = record.get({ plain: true }) as any;
      return {
        id: plain.id,
        scheduleId: plain.eventScheduleId,
        scheduleName: plain.EventSchedule.label || plain.EventSchedule.scheduleName || 'Fecha',
        startDateTime: plain.EventSchedule.startDateTime,
        checkInTime: plain.checkInTime,
      };
    });
  }
}

export const attendanceHistoryService = new AttendanceHistoryService();
