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
import { AuditLog } from '../models';
import { auditLogService } from './auditLogService';

export class EventService {
  async createEvent(data: z.infer<typeof createEventSchema>, userId: string) {
    const validatedData = createEventSchema.parse(data);
    
    // Auto-generate slug if public and missing
    if (validatedData.isPublic && !validatedData.publicSlug) {
      let baseSlug = slugify(validatedData.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check for uniqueness (incluye soft-deleted: el índice UNIQUE los cuenta)
      while (await Event.findOne({ where: { publicSlug: slug }, paranoid: false })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      validatedData.publicSlug = slug;
    }

    const event = await Event.create({ ...validatedData, createdBy: userId });
    await auditLogService.log({ userId, action: 'CREATE', entity: 'Event', entityId: event.id, details: { name: event.name } });
    return event;
  }

  async updateEvent(eventId: string, data: z.infer<typeof updateEventSchema>, userId?: string) {
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
       
       // Check for uniqueness (excluding current event; incluye soft-deleted)
       while (await Event.findOne({ where: { publicSlug: slug, id: { [Op.ne]: eventId } }, paranoid: false })) {
         slug = `${baseSlug}-${counter}`;
         counter++;
       }
       validatedData.publicSlug = slug;
    }

    // Clon profundo: get({plain:true}) queda aliased a los datos vivos y update() lo mutaría.
    const before: any = JSON.parse(JSON.stringify(event.get({ plain: true })));
    await event.update(validatedData);
    if (userId) {
      const after: any = event.get({ plain: true });
      const changes: Record<string, { from: any; to: any }> = {};
      for (const k of Object.keys(validatedData)) {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changes[k] = { from: before[k] ?? null, to: after[k] ?? null };
      }
      if (Object.keys(changes).length) {
        await auditLogService.log({ userId, action: 'UPDATE', entity: 'Event', entityId: event.id, details: { name: event.name, changes } });
      }
    }
    return event;
  }

  async deleteEvent(eventId: string, userId?: string, reason?: string) {
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    const name = (event as any).name;
    // Soft delete
    await event.destroy();
    // Registro de auditoría: qué se eliminó, el motivo y quién lo hizo.
    if (userId) {
      await auditLogService.log({
        userId,
        action: 'DELETE',
        entity: 'Event',
        entityId: eventId,
        details: { name, reason: reason || null },
      });
    }
    return { message: 'Event deleted successfully' };
  }

  async getEventById(eventId: string, includeSchedules = false) {
    // Update schedule statuses based on time
    await this._updateScheduleStatuses(eventId);

    const options: any = {
      include: [],
    };
    if (includeSchedules) {
      options.include.push({ 
        model: EventSchedule, 
        as: 'schedules',
        separate: true,
        order: [
          [literal(`CASE 
            WHEN status = 'accrediting' THEN 1 
            WHEN status = 'published' THEN 2 
            WHEN status = 'accredited' THEN 3 
            ELSE 4 
          END`), 'ASC'],
          ['startDateTime', 'ASC']
        ]
      });
    }
    const event = await Event.findByPk(eventId, options);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  }

  async getAllEvents(filters: { 
    isActive?: boolean; 
    createdBy?: string; 
    page?: number; 
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    includeSchedules?: boolean;
    filter?: 'all' | 'accredited' | 'accrediting' | 'upcoming' | 'cancelled';
  }) {
    const { isActive, createdBy, page = 1, limit = 10, search, sortBy, sortOrder = 'DESC', includeSchedules = false, filter } = filters;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (createdBy) where.createdBy = createdBy;

    await this._updateScheduleStatuses();

    if (filter) {
        if (filter === 'accrediting') {
             where[Op.and] = [
                ...(where[Op.and] || []),
                literal(`EXISTS (SELECT 1 FROM event_schedules es WHERE es.event_id = "Event".id AND es.status = 'accrediting')`)
             ];
             where.isActive = true;
        } else if (filter === 'accredited') {
             where[Op.and] = [
                ...(where[Op.and] || []),
                literal(`EXISTS (SELECT 1 FROM event_schedules es WHERE es.event_id = "Event".id AND es.status = 'accredited')`),
                literal(`NOT EXISTS (SELECT 1 FROM event_schedules es WHERE es.event_id = "Event".id AND es.status IN ('published', 'accrediting'))`)
             ];
             where.isActive = true;
        } else if (filter === 'upcoming') {
             const now = new Date();
             const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
             const nowStr = now.toISOString();
             const sevenDaysStr = sevenDaysFromNow.toISOString();
             
             where[Op.and] = [
                ...(where[Op.and] || []),
                literal(`EXISTS (SELECT 1 FROM event_schedules es WHERE es.event_id = "Event".id AND es.status = 'published' AND es.start_date_time BETWEEN '${nowStr}' AND '${sevenDaysStr}')`)
             ];
             where.isActive = true;
        } else if (filter === 'cancelled') {
             where.isActive = false;
        }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }

    let order: any = [];

    if (sortBy) {
      order = [[sortBy, sortOrder]];
    } else {
      order = [
        // 1. Priority by status: Accrediting > Published > Accredited
        [literal(`(
          SELECT MAX(CASE 
            WHEN es.status = 'accrediting' THEN 3
            WHEN es.status = 'published' THEN 2
            WHEN es.status = 'accredited' THEN 1
            ELSE 0
          END)
          FROM event_schedules es
          WHERE es.event_id = "Event".id
        )`), 'DESC'],

        // 2. Nearest published schedule start time
        [literal(`(
            SELECT MIN(es.start_date_time)
            FROM event_schedules es
            WHERE es.event_id = "Event".id AND es.status = 'published'
        )`), 'ASC'],

        // 3. Most recent accredited schedule end time
        [literal(`(
            SELECT MAX(es.end_date_time)
            FROM event_schedules es
            WHERE es.event_id = "Event".id AND es.status = 'accredited'
        )`), 'DESC'],

        ['createdAt', 'DESC']
      ];
    }

    const include: any[] = [];
    if (includeSchedules) {
      include.push({
        model: EventSchedule,
        as: 'schedules',
        separate: true,
        order: [
          [literal(`CASE 
            WHEN status = 'accrediting' THEN 1 
            WHEN status = 'published' THEN 2 
            WHEN status = 'accredited' THEN 3 
            ELSE 4 
          END`), 'ASC'],
          ['startDateTime', 'ASC']
        ]
      });
    }

    // 1. Fetch events with pagination
    const { count, rows } = await Event.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order,
      include,
      distinct: true, // Important for correct count with includes
    });

    // 2. Fetch participant counts for these events
    if (rows.length > 0) {
      const eventIds = rows.map(e => e.id);
      
      // Count distinct participants per event via EventSchedule
      const participantCounts = await EventSchedule.findAll({
        attributes: ['eventId', [fn('COUNT', fn('DISTINCT', col('participants.id'))), 'count']],
        include: [{
          model: Participant,
          as: 'participants',
          attributes: [],
          through: { attributes: [] }
        }],
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
    const schedules = await EventSchedule.findAll({ 
      where: { eventId },
      order: [
        [literal(`CASE 
          WHEN status = 'accrediting' THEN 1 
          WHEN status = 'published' THEN 2 
          WHEN status = 'accredited' THEN 3 
          ELSE 4 
        END`), 'ASC'],
        ['startDateTime', 'ASC']
      ]
    });
    return schedules;
  }

  // Wrapper público para refrescar los estados de horarios (published→accrediting→accredited por tiempo).
  async refreshScheduleStatuses(eventId?: string) {
    return this._updateScheduleStatuses(eventId);
  }

  private async _updateScheduleStatuses(eventId?: string) {
    const now = new Date();

    if (!eventId) {
      const FIVE_MINUTES = 5 * 60 * 1000;

      const lastBulk = await AuditLog.findOne({
        where: {
          action: 'SYSTEM-BULK-UPDATE',
          entity: 'EventSchedule',
        },
        order: [['createdAt', 'DESC']],
      });

      if (lastBulk && now.getTime() - lastBulk.createdAt.getTime() < FIVE_MINUTES) {
        return;
      }
    }

    const publishedWhere: any = {
      status: 'published',
      startDateTime: { [Op.lte]: now },
    };

    const accreditingWhere: any = {
      status: 'accrediting',
      endDateTime: { [Op.lte]: now },
    };

    // Si se pasa eventId, filtramos por ese evento; si no, se actualizan todos
    if (eventId) {
      publishedWhere.eventId = eventId;
      accreditingWhere.eventId = eventId;
    }

    // 1. Update 'published' -> 'accrediting'
    await EventSchedule.update(
      { status: 'accrediting' },
      { where: publishedWhere }
    );

    // 2. Update 'accrediting' -> 'accredited'
    await EventSchedule.update(
      { status: 'accredited' },
      { where: accreditingWhere }
    );

    if (!eventId) {
      await AuditLog.create({
        userId: '90eb6c3a-6654-449a-b1d4-a2f05b9f80f1',
        action: 'SYSTEM-BULK-UPDATE',
        entity: 'EventSchedule',
        entityId: null,
        details: {
          scope: 'all-events',
          executedAt: now.toISOString(),
        },
      });
    }
  }
}

export const eventService = new EventService();