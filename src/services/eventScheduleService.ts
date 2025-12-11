import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { Event, EventSchedule, Accreditation } from '@/models/index';
import { createScheduleSchema, updateScheduleSchema } from '@/utils/validators/eventSchemas';

export class EventScheduleService {
  async createSchedule(eventId: string, data: z.infer<typeof createScheduleSchema>) {
    const validatedData = createScheduleSchema.parse(data);
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error(`Evento ${eventId} no encontrado para la agenda.`);
    }

    // Optional: Check for overlapping schedules
    const overlapping = await EventSchedule.findOne({
        where: {
            eventId,
            [Op.or]: [
                { startDateTime: { [Op.between]: [validatedData.startDateTime, validatedData.endDateTime] } },
                { endDateTime: { [Op.between]: [validatedData.startDateTime, validatedData.endDateTime] } },
            ]
        }
    });

    if (overlapping) {
        throw new Error('Schedule overlaps with an existing one.');
    }

    const schedule = await EventSchedule.create({ ...validatedData, eventId });
    return schedule;
  }

  async updateSchedule(scheduleId: string, data: z.infer<typeof updateScheduleSchema>) {
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

    await schedule.update(validatedData);
    return schedule;
  }

  async deleteSchedule(scheduleId: string) {
    const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId } });
    if (accreditedCount > 0) {
      throw new Error('Cannot delete schedule with existing accreditations.');
    }
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    await schedule.destroy();
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

  async getAvailableCapacity(scheduleId: string): Promise<number> {
    const schedule = await EventSchedule.findByPk(scheduleId, {
        include: [{ model: Event, attributes: ['maxCapacity'] }]
    });
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const event = (schedule as any).Event;
    const capacity = schedule.maxCapacity || event?.maxCapacity || 0;
    if (capacity === 0) return Infinity; // No capacity limit

    const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId } });
    
    return capacity - accreditedCount;
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
