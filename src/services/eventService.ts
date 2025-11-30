import { z } from 'zod';
import { Op, fn, col, literal } from 'sequelize';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import Participant from '@/models/Participant';
import Accreditation from '@/models/Accreditation';
import Award from '@/models/Award';
import ParticipantAward from '@/models/ParticipantAward';
import { createEventSchema, updateEventSchema } from '@/utils/validators/eventSchemas';
import User from '@/models/User';

export class EventService {
  async createEvent(data: z.infer<typeof createEventSchema>) {
    const validatedData = createEventSchema.parse(data);
    const event = await Event.create({ ...validatedData });
    return event;
  }

  async updateEvent(eventId: number, data: z.infer<typeof updateEventSchema>) {
    const validatedData = updateEventSchema.parse(data);
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    await event.update(validatedData);
    return event;
  }

  async deleteEvent(eventId: number) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    // Soft delete
    await event.destroy();
    return { message: 'Event deleted successfully' };
  }

  async getEventById(eventId: number, includeSchedules = false) {
    const options: any = {
      include: [],
    };
    if (includeSchedules) {
      options.include.push({ model: EventSchedule, as: 'schedules' });
    }
    const event = await Event.findByPk(eventId, options);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  }

  async getAllEvents(filters: { isActive?: boolean; createdBy?: string; page?: number; limit?: number }) {
    const { isActive, createdBy, page = 1, limit = 10 } = filters;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (createdBy) where.createdBy = createdBy;

    const { count, rows } = await Event.findAndCountAll({
      where,
      include: [
        {
          model: Participant,
          attributes: [],
        },
      ],
      attributes: {
        include: [[fn('COUNT', col('Participants.id')), 'participantCount']],
      },
      group: ['Event.id'],
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    return { events: rows, total: count.length, page, limit };
  }

  async getSchedulesForEvent(eventId: string) {
    const schedules = await EventSchedule.findAll({ where: { eventId } });
    return schedules;
  }

  async getEventStatistics(eventId: number) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const totalParticipants = await Participant.count({ where: { eventId } });

    const accreditedBySchedule = await Accreditation.findAll({
      attributes: [
        'eventScheduleId',
        [fn('COUNT', col('Accreditation.id')), 'accreditedCount'],
      ],
      include: [{
        model: EventSchedule,
        where: { eventId },
        attributes: ['scheduleName'],
      }],
      group: ['eventScheduleId', 'EventSchedule.id'],
    });

    const awards = await Award.findAll({
        where: { eventId },
        attributes: ['id', 'name', 'quantity'],
    });

    const deliveredAwards = await ParticipantAward.count({
        include: [{
            model: Award,
            where: { eventId },
            attributes: []
        }],
        where: {
            deliveredAt: { [Op.ne]: null }
        }
    });

    const capacityUsage: any[] = await EventSchedule.findAll({
        where: { eventId },
        attributes: ['id', 'scheduleName', 'maxCapacity'],
        include: [{
            model: Accreditation,
            attributes: [],
        }],
        group: ['EventSchedule.id'],
    });

    const stats = {
      totalParticipants,
      accreditedBySchedule: accreditedBySchedule.map((item: any) => ({
        scheduleId: item.eventScheduleId,
        scheduleName: (item.EventSchedule as EventSchedule).scheduleName,
        accreditedCount: (item.get('accreditedCount') as number),
      })),
      awards: {
          total: awards.reduce((sum, award) => sum + award.quantity, 0),
          delivered: deliveredAwards,
          details: awards,
      },
      capacityUsage: capacityUsage.map(schedule => {
          const used = schedule.Accreditations?.length || 0;
          const capacity = schedule.maxCapacity || (event as any).maxCapacity || 0;
          return {
              scheduleId: schedule.id,
              scheduleName: schedule.scheduleName,
              capacity,
              used,
              available: capacity - used,
          }
      })
    };

    return stats;
  }
}

export const eventService = new EventService();