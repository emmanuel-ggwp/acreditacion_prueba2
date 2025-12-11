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
import { slugify } from '@/utils/formatters';

export class EventService {
  async createEvent(data: z.infer<typeof createEventSchema>, userId: string) {
    const validatedData = createEventSchema.parse(data);
    
    // Auto-generate slug if public and missing
    if (validatedData.isPublic && !validatedData.publicSlug) {
      let baseSlug = slugify(validatedData.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check for uniqueness
      while (await Event.findOne({ where: { publicSlug: slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      validatedData.publicSlug = slug;
    }

    const event = await Event.create({ ...validatedData, createdBy: userId });
    return event;
  }

  async updateEvent(eventId: string, data: z.infer<typeof updateEventSchema>) {
    const validatedData = updateEventSchema.parse(data);
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Determine if the event will be public after this update
    const willBePublic = validatedData.isPublic ?? event.isPublic;

    // Check if we need to generate a slug:
    // 1. It will be public
    // 2. AND (publicSlug is explicitly cleared/empty in this update OR (it's not in update AND missing in DB))
    const slugIsCleared = validatedData.publicSlug === '' || validatedData.publicSlug === null;
    const slugIsMissing = validatedData.publicSlug === undefined && !event.publicSlug;

    if (willBePublic && (slugIsCleared || slugIsMissing)) {
       let baseSlug = slugify(validatedData.name || event.name);
       let slug = baseSlug;
       let counter = 1;
       
       // Check for uniqueness (excluding current event)
       while (await Event.findOne({ where: { publicSlug: slug, id: { [Op.ne]: eventId } } })) {
         slug = `${baseSlug}-${counter}`;
         counter++;
       }
       validatedData.publicSlug = slug;
    }

    await event.update(validatedData);
    return event;
  }

  async deleteEvent(eventId: string) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    // Soft delete
    await event.destroy();
    return { message: 'Event deleted successfully' };
  }

  async getEventById(eventId: string, includeSchedules = false) {
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

    // 1. Fetch events with pagination
    const { count, rows } = await Event.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    // 2. Fetch participant counts for these events
    if (rows.length > 0) {
      const eventIds = rows.map(e => e.id);
      const participantCounts = await Participant.findAll({
        attributes: ['eventId', [fn('COUNT', col('id')), 'count']],
        where: {
          eventId: eventIds,
        },
        group: ['eventId'],
        raw: true,
      });

      // 3. Map counts to events
      const countMap = new Map<string, number>();
      (participantCounts as any[]).forEach((p: any) => {
        countMap.set(p.eventId, parseInt(p.count, 10));
      });

      rows.forEach(event => {
        const count = countMap.get(event.id) || 0;
        event.setDataValue('participantCount' as any, count);
      });
    }

    return { events: rows, total: count, page, limit };
  }

  async getSchedulesForEvent(eventId: string) {
    const schedules = await EventSchedule.findAll({ where: { eventId } });
    return schedules;
  }

  async getEventStatistics(eventId: string) {
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