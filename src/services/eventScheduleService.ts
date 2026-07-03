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

    // La capacidad de una fecha no puede superar la capacidad máxima del evento.
    const evMax = Number((event as any).maxCapacity) || 0;
    const sMax = Number((validatedData as any).maxCapacity) || 0;
    if (evMax > 0 && sMax > evMax) {
      throw new Error(`La capacidad de la fecha (${sMax}) no puede superar la capacidad máxima del evento (${evMax}).`);
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

    if (validatedData.startDateTime || validatedData.endDateTime) {
        const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId }});
        if (accreditedCount > 0) {
            throw new Error('Cannot change dates of a schedule with existing accreditations.');
        }
    }

    // La capacidad de una fecha no puede superar la capacidad máxima del evento.
    if (validatedData.maxCapacity != null) {
        const event = await Event.findByPk((schedule as any).eventId);
        const evMax = Number((event as any)?.maxCapacity) || 0;
        const sMax = Number(validatedData.maxCapacity) || 0;
        if (evMax > 0 && sMax > evMax) {
            throw new Error(`La capacidad de la fecha (${sMax}) no puede superar la capacidad máxima del evento (${evMax}).`);
        }
    }

    const before: any = JSON.parse(JSON.stringify(schedule.get({ plain: true })));
    await schedule.update(validatedData);
    if (userId) {
      const changes = auditLogService.buildChanges(before, schedule.get({ plain: true }), Object.keys(validatedData));
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
