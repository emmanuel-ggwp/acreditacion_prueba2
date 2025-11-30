import { Op, fn, col, literal, Sequelize } from 'sequelize';
import { startOfHour, endOfHour, eachHourOfInterval, format, startOfDay, endOfDay, subMinutes, parseISO } from 'date-fns';
import { stringify } from 'csv-stringify/sync';

import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import Accreditation from '@/models/Accreditation';
import Award from '@/models/Award';
import ParticipantAward from '@/models/ParticipantAward';
import User from '@/models/User';

// Define interfaces for filters to ensure type safety
interface IAttendanceReportFilters {
  eventId?: string;
  scheduleId?: string;
  startDate?: string;
  endDate?: string;
}

interface IUserActivityReportDateRange {
    startDate?: string;
    endDate?: string;
}

export class ReportService {

  async getEventReport(eventId: number) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error('Event not found');

    const totalParticipants = await Participant.count({ where: { eventId } });
    const accreditedParticipants = await Accreditation.count({
      where: { participantId: { [Op.ne]: null } },
      include: [{ model: EventSchedule, where: { eventId }, attributes: [] }]
    });
    const accreditedGuests = await Accreditation.count({
      where: { guestId: { [Op.ne]: null } },
      include: [{ model: EventSchedule, where: { eventId }, attributes: [] }]
    });

    const schedules = await EventSchedule.findAll({ where: { eventId } });
    const scheduleDetails = await Promise.all(schedules.map(async (s: EventSchedule) => {
      const capacity = s.maxCapacity ?? event.maxCapacity ?? 0;
      const accreditedCount = await Accreditation.count({ where: { eventScheduleId: s.id } });
      const participantCount = await Accreditation.count({ where: { eventScheduleId: s.id, participantId: { [Op.ne]: null } } });
      const guestCount = await Accreditation.count({ where: { eventScheduleId: s.id, guestId: { [Op.ne]: null } } });
      return {
        scheduleName: s.scheduleName,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        capacity,
        accreditedTotal: accreditedCount,
        accreditedParticipants: participantCount,
        accreditedGuests: guestCount,
        capacityUsedPercentage: capacity > 0 ? (accreditedCount / capacity) * 100 : 0,
      };
    }));

    const awardsAssigned = await ParticipantAward.count({ include: [{ model: Award, where: { eventId }, attributes: [] }] });
    const awardsDelivered = await ParticipantAward.count({
      where: { deliveredAt: { [Op.ne]: null } },
      include: [{ model: Award, where: { eventId }, attributes: [] }]
    });

    const accreditations = await Accreditation.findAll({
        include: [{ model: EventSchedule, where: { eventId }, attributes: ['startDateTime', 'endDateTime'] }],
        order: [['checkInTime', 'ASC']]
    });

    const firstAccreditation = accreditations[0];
    const lastAccreditation = accreditations[accreditations.length - 1];
    let accreditationTimeline: { hour: string, count: number }[] = [];
    if(firstAccreditation && lastAccreditation) {
        const interval = { start: startOfHour(firstAccreditation.checkInTime), end: endOfHour(lastAccreditation.checkInTime) };
        accreditationTimeline = eachHourOfInterval(interval).map(hour => ({
            hour: format(hour, 'yyyy-MM-dd HH:mm'),
            count: 0
        }));
        accreditations.forEach((acc: Accreditation) => {
            const hourIndex = accreditationTimeline.findIndex(t => t.hour === format(startOfHour(acc.checkInTime), 'yyyy-MM-dd HH:mm'));
            if(hourIndex !== -1) accreditationTimeline[hourIndex].count++;
        });
    }

    return {
      eventInfo: event,
      participantStats: {
        registered: totalParticipants,
        accreditedTotal: accreditedParticipants + accreditedGuests,
        accreditedParticipants,
        accreditedGuests,
      },
      scheduleBreakdown: scheduleDetails,
      awardStats: {
        assigned: awardsAssigned,
        delivered: awardsDelivered,
        pending: awardsAssigned - awardsDelivered,
      },
      accreditationTimeline,
    };
  }

  async getScheduleReport(scheduleId: number, pagination = { page: 1, limit: 20 }) {
    const schedule = await EventSchedule.findByPk(scheduleId, { include: [Event] });
    if (!schedule) throw new Error('Schedule not found');

    const { count, rows } = await Accreditation.findAndCountAll({
      where: { eventScheduleId: scheduleId },
      include: [
        { model: Participant, attributes: ['firstName', 'lastName', 'email'] },
        { model: Guest, attributes: ['firstName', 'lastName'] },
        { model: User, as: 'accreditedByUser', attributes: ['firstName', 'lastName'] }
      ],
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit,
      order: [['checkInTime', 'ASC']]
    });
    
    // Check-in stats by hour range
    const accreditations = await Accreditation.findAll({ where: { eventScheduleId: scheduleId }, attributes: ['checkInTime'] });
    const checkInStats = accreditations.reduce((acc: Record<string, number>, curr: Accreditation) => {
        const hour = format(curr.checkInTime, 'HH');
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);


    return {
      scheduleInfo: schedule,
      accreditations: {
        total: count,
        page: pagination.page,
        limit: pagination.limit,
        data: rows,
      },
      checkInStatsByHour: checkInStats
    };
  }

  async getAttendanceReport(filters: IAttendanceReportFilters) {
    const whereClause: any = {};
    const scheduleWhere: any = {};

    if (filters.eventId) scheduleWhere.eventId = filters.eventId;
    if (filters.scheduleId) whereClause.eventScheduleId = filters.scheduleId;
    if (filters.startDate && filters.endDate) {
      whereClause.checkInTime = { [Op.between]: [parseISO(filters.startDate), parseISO(filters.endDate)] };
    }

    const accreditations = await Accreditation.findAll({
      where: whereClause,
      include: [
        { model: EventSchedule, where: scheduleWhere, attributes: ['scheduleName'] },
        { model: Participant, attributes: ['firstName', 'lastName', 'email', 'documentNumber'] },
        { model: Guest, attributes: ['firstName', 'lastName', 'documentNumber'], include: [{model: Participant, as: 'associatedParticipant', attributes: ['email']}] },
      ],
      order: [['checkInTime', 'ASC']]
    });

    return accreditations.map((acc: any) => {
        const person = acc.Participant || acc.Guest;
        const isGuest = !!acc.Guest;
        return {
            name: `${person!.firstName} ${person!.lastName}`,
            email: isGuest ? acc.Guest!.associatedParticipant?.email : acc.Participant!.email,
            document: person!.documentNumber,
            type: isGuest ? 'Guest' : 'Participant',
            schedule: acc.EventSchedule!.scheduleName,
            accreditedAt: acc.checkInTime,
        }
    });
  }

  async getAwardsReport(eventId: string) {
    const awards = await Award.findAll({ where: { eventId } });

    const awardDetails = await Promise.all(awards.map(async (award: Award) => {
      const assigned = await ParticipantAward.count({ where: { awardId: award.id } });
      const delivered = await ParticipantAward.count({ where: { awardId: award.id, deliveredAt: { [Op.ne]: null } } });
      return {
        name: award.name,
        totalStock: award.quantity,
        assigned,
        delivered,
        pending: assigned - delivered,
        availableStock: award.quantity - assigned,
      };
    }));

    const awardedParticipants = await ParticipantAward.findAll({
        include: [
            { model: Award, where: { eventId }, attributes: ['name'] },
            { model: Participant, attributes: ['firstName', 'lastName', 'email'] }
        ]
    });

    return {
      awardDetails,
      awardedParticipants: awardedParticipants.map((pa: any) => ({
          participant: `${pa.Participant!.firstName} ${pa.Participant!.lastName}`,
          email: pa.Participant!.email,
          award: pa.Award!.name,
          status: pa.deliveredAt ? 'Delivered' : 'Assigned',
          deliveredAt: pa.deliveredAt
      }))
    };
  }

  async getUserActivityReport(userId: number, dateRange: IUserActivityReportDateRange) {
    const where: any = { accreditedBy: userId };
    if (dateRange.startDate && dateRange.endDate) {
        where.checkInTime = { [Op.between]: [parseISO(dateRange.startDate), parseISO(dateRange.endDate)] };
    }

    const accreditations = await Accreditation.findAll({
      where,
      include: [EventSchedule]
    });

    const awardsWhere: any = { deliveredBy: userId };
    if (dateRange.startDate && dateRange.endDate) {
        awardsWhere.deliveredAt = { [Op.between]: [parseISO(dateRange.startDate), parseISO(dateRange.endDate)] };
    }

    const awardsDelivered = await ParticipantAward.findAll({
      where: awardsWhere,
      include: [Award]
    });

    return {
      user: await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName'] }),
      accreditations,
      awardsDelivered,
    };
  }

  async getDashboardStats(eventId?: number) {
    if (eventId) {
      const event = await Event.findByPk(eventId);
      if (!event) throw new Error('Event not found');
      const accreditedCount = await Accreditation.count({ include: [{ model: EventSchedule, where: { eventId } }] });
      const awardsPending = await ParticipantAward.count({
        where: { deliveredAt: null },
        include: [{ model: Award, where: { eventId } }]
      });
      return {
        eventName: event.name,
        totalParticipants: await Participant.count({ where: { eventId } }),
        totalAccredited: accreditedCount,
        awardsPending,
      };
    } else {
      const today = new Date();
      return {
        totalEvents: await Event.count(),
        totalParticipants: await Participant.count(),
        accreditationsToday: await Accreditation.count({
          where: { checkInTime: { [Op.between]: [startOfDay(today), endOfDay(today)] } }
        }),
      };
    }
  }

  async getRealTimeStats(eventId: number) {
    const now = new Date();
    const thirtyMinutesAgo = subMinutes(now, 30);

    const accreditationsLast30Min = await Accreditation.count({
      include: [{ model: EventSchedule, where: { eventId } }],
      where: { checkInTime: { [Op.gte]: thirtyMinutesAgo } }
    });

    const activeSchedules = await EventSchedule.findAll({
        where: { eventId, startDateTime: { [Op.lte]: now }, endDateTime: { [Op.gte]: now } },
        include: [Event]
    });

    const currentCapacity = await Promise.all(activeSchedules.map(async (s: any) => {
        const event = s.Event;
        const capacity = s.maxCapacity ?? event.maxCapacity ?? 0;
        const accredited = await Accreditation.count({ where: { eventScheduleId: s.id } });
        return {
            scheduleName: s.scheduleName,
            capacity,
            accredited,
            available: capacity > 0 ? capacity - accredited : Infinity
        }
    }));

    const firstAccreditation = await Accreditation.findOne({ include: [{ model: EventSchedule, where: { eventId } }], order: [['checkInTime', 'ASC']] });
    let rate = 0;
    if(firstAccreditation) {
        const minutesElapsed = (now.getTime() - firstAccreditation.checkInTime.getTime()) / 60000;
        const totalAccredited = await Accreditation.count({ include: [{ model: EventSchedule, where: { eventId } }] });
        if(minutesElapsed > 0) rate = totalAccredited / minutesElapsed;
    }

    return {
      accreditationsLast30Min,
      currentCapacity,
      accreditationRatePerMinute: rate,
    };
  }

  async generateCsv(data: any[]): Promise<string> {
    if (!data || data.length === 0) {
      return '';
    }
    const columns = Object.keys(data[0]);
    return stringify(data, { header: true, columns });
  }
}

export const reportService = new ReportService();
