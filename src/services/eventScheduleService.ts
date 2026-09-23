import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { Event, EventSchedule, Accreditation } from '@/models/index';
import { createScheduleSchema, updateScheduleSchema } from '@/utils/validators/eventSchemas';
import { auditLogService } from './auditLogService';

const scheduleName = (s: any) => s.label || s.scheduleName;

export class EventScheduleService {
  async createSchedule(eventId: string, data: z.infer<typeof createScheduleSchema>, userId?: string) {
    const validatedData = createScheduleSchema.parse(data);
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error(`Evento ${eventId} no encontrado para la agenda.`);
    }

    // El cupo de participantes de una fecha no puede superar el del evento.
    const evMax = Number((event as any).maxCapacity) || 0;
    const sMax = Number((validatedData as any).maxCapacity) || 0;
    if (evMax > 0 && sMax > evMax) {
      throw new Error(`El cupo de participantes de la fecha (${sMax}) no puede superar el del evento (${evMax}).`);
    }
    // El aforo total (participantes + invitados) no puede ser menor que el cupo de participantes.
    const sAforo = Number((validatedData as any).maxAttendees) || 0;
    if (sMax > 0 && sAforo > 0 && sAforo < sMax) {
      throw new Error(`El aforo total (${sAforo}) no puede ser menor que el cupo de participantes (${sMax}).`);
    }

    // Nota: se permiten horarios que se solapan (ej. sesiones paralelas en distintas salas).
    const schedule = await EventSchedule.create({ ...validatedData, eventId });
    if (userId) {
      await auditLogService.log({ userId, action: 'CREATE', entity: 'EventSchedule', entityId: schedule.id, details: { name: scheduleName(schedule) } });
    }
    return schedule;
  }

  async updateSchedule(scheduleId: string, data: z.infer<typeof updateScheduleSchema>, userId?: string) {
    const validatedData = updateScheduleSchema.parse(data);
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // La fecha y hora de término debe ser posterior a la de inicio. updateScheduleSchema
    // no puede validarlo (el .partial() descarta el .refine() del base y además puede
    // venir una sola de las dos fechas), así que se valida con los valores EFECTIVOS:
    // lo que trae la edición o, si no, lo que ya tiene la fecha.
    const effStart = new Date((validatedData.startDateTime ?? (schedule as any).startDateTime) as any);
    const effEnd = new Date((validatedData.endDateTime ?? (schedule as any).endDateTime) as any);
    if (!isNaN(effStart.getTime()) && !isNaN(effEnd.getTime()) && effEnd <= effStart) {
      throw new Error('La fecha y hora de término debe ser posterior a la de inicio.');
    }

    // Solo se bloquea si las fechas CAMBIAN de verdad (el formulario reenvía siempre
    // start/endDateTime, así que comparar por presencia impedía editar cualquier otro
    // campo —cupo, aforo, ubicación— de un horario con acreditaciones).
    const sameTime = (a: any, b: any) => a != null && b != null && new Date(a).getTime() === new Date(b).getTime();
    const changingStart = validatedData.startDateTime != null && !sameTime(validatedData.startDateTime, (schedule as any).startDateTime);
    const changingEnd = validatedData.endDateTime != null && !sameTime(validatedData.endDateTime, (schedule as any).endDateTime);
    if (changingStart || changingEnd) {
        const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId }});
        if (accreditedCount > 0) {
            throw new Error('Cannot change dates of a schedule with existing accreditations.');
        }
    }

    // El cupo de participantes de una fecha no puede superar el del evento.
    if (validatedData.maxCapacity != null) {
        const event = await Event.findByPk((schedule as any).eventId);
        const evMax = Number((event as any)?.maxCapacity) || 0;
        const sMax = Number(validatedData.maxCapacity) || 0;
        if (evMax > 0 && sMax > evMax) {
            throw new Error(`El cupo de participantes de la fecha (${sMax}) no puede superar el del evento (${evMax}).`);
        }
    }
    // El aforo total no puede ser menor que el cupo de participantes (usando los valores
    // efectivos: lo que trae la edición, o lo que ya tiene la fecha).
    if (validatedData.maxCapacity != null || (validatedData as any).maxAttendees != null) {
        const cap = Number(validatedData.maxCapacity ?? (schedule as any).maxCapacity) || 0;
        const aforo = Number((validatedData as any).maxAttendees ?? (schedule as any).maxAttendees) || 0;
        if (cap > 0 && aforo > 0 && aforo < cap) {
            throw new Error(`El aforo total (${aforo}) no puede ser menor que el cupo de participantes (${cap}).`);
        }
    }

    // `eventId` no se cambia por edición (mass-assignment): una fecha no se mueve a
    // otro evento. El create sí lo fija desde la ruta.
    const { eventId: _ignoredEventId, ...rest } = validatedData as any;
    const before: any = JSON.parse(JSON.stringify(schedule.get({ plain: true })));
    await schedule.update(rest);
    if (userId) {
      const changes = auditLogService.buildChanges(before, schedule.get({ plain: true }), Object.keys(rest));
      if (Object.keys(changes).length) {
        await auditLogService.log({ userId, action: 'UPDATE', entity: 'EventSchedule', entityId: schedule.id, details: { name: scheduleName(schedule), changes } });
      }
    }
    return schedule;
  }

  async deleteSchedule(scheduleId: string, userId?: string, reason?: string) {
    const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId } });
    if (accreditedCount > 0) {
      throw new Error('Cannot delete schedule with existing accreditations.');
    }
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    const name = scheduleName(schedule);
    await schedule.destroy();
    if (userId) {
      await auditLogService.log({ userId, action: 'DELETE', entity: 'EventSchedule', entityId: scheduleId, details: { name, reason: reason || null } });
    }
    return { message: 'Schedule deleted successfully' };
  }

  async getSchedulesByEvent(eventId: string) {
    const schedules = await EventSchedule.findAll({
      where: { eventId },
      include: [
        {
          model: Accreditation,
          attributes: [],
        },
        {
          model: Event,
          attributes: ['location', 'maxCapacity'],
        }
      ],
      attributes: {
        include: [[fn('COUNT', col('Accreditations.id')), 'accreditedCount']],
      },
      group: ['EventSchedule.id', 'Event.id'],
      order: [['startDateTime', 'ASC']],
    });
    return schedules;
  }

  // Horarios relevantes para acreditar (cross-evento): los que están EN acreditación ahora,
  // más los publicados de HOY (para abrirlos/prepararlos). Incluye evento y nº de acreditados.
  async getActiveSchedules() {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);

    return EventSchedule.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { status: 'accrediting' },
          { status: 'published', startDateTime: { [Op.between]: [startToday, endToday] } },
        ],
      },
      include: [
        { model: Accreditation, attributes: [] },
        { model: Event, attributes: ['id', 'name', 'location', 'maxCapacity'] },
      ],
      attributes: {
        include: [[fn('COUNT', col('Accreditations.id')), 'accreditedCount']],
      },
      group: ['EventSchedule.id', 'Event.id'],
      order: [['startDateTime', 'ASC']],
    });
  }

  // Abrir/cerrar acreditación a mano (published|accrediting|accredited|cancelled).
  async setStatus(scheduleId: string, status: string, userId?: string) {
    const allowed = ['published', 'accrediting', 'accredited', 'cancelled'];
    if (!allowed.includes(status)) throw new Error('Estado de horario inválido');
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const from = (schedule as any).status;
    await schedule.update({ status });
    if (userId && from !== status) {
      await auditLogService.log({
        userId,
        action: 'UPDATE',
        entity: 'EventSchedule',
        entityId: schedule.id,
        details: { name: scheduleName(schedule), changes: { status: { from, to: status } } },
      });
    }
    return schedule;
  }

  // Asignar/quitar la imagen de un horario (solo el campo imageUrl, sin tocar fechas).
  async setImage(scheduleId: string, imageUrl: string | null, userId?: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    await schedule.update({ imageUrl: imageUrl || null });
    if (userId) {
      await auditLogService.log({
        userId,
        action: 'UPDATE',
        entity: 'EventSchedule',
        entityId: schedule.id,
        details: { name: scheduleName(schedule), changes: { imagen: imageUrl ? 'actualizada' : 'quitada' } },
      });
    }
    return schedule;
  }

  async searchSchedules(query: { name?: string, startDate?: Date, endDate?: Date }) {
    const where: any = {};
    
    if (query.name) {
      where.scheduleName = { [Op.iLike]: `%${query.name}%` };
    }

    if (query.startDate && query.endDate) {
        where.startDateTime = {
            [Op.between]: [query.startDate, query.endDate]
        };
    } else if (query.startDate) {
        where.startDateTime = { [Op.gte]: query.startDate };
    }

    return await EventSchedule.findAll({
      where,
      include: [{ model: Event, attributes: ['name'] }],
      order: [['startDateTime', 'ASC']],
      limit: 50
    });
  }
}

export const eventScheduleService = new EventScheduleService();
