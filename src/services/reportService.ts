import { Op, fn, col, literal, Sequelize, QueryTypes } from 'sequelize';
import { startOfHour, endOfHour, eachHourOfInterval, format, startOfDay, endOfDay, subMinutes } from 'date-fns';
import { stringify } from 'csv-stringify/sync';
import { sequelize } from '../lib/sequelize';

import { 
  Event, 
  EventSchedule, 
  Participant,
  ParticipantSchedule,
  Accreditation,
  Award,
  ParticipantAward
} from '@/models/index';

export class ReportService {

  async getEventReport(eventId: string) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error('Event not found');

    // 1. Get all schedules for this event
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
    const scheduleIds = schedules.map(s => s.id);

    if (scheduleIds.length === 0) {
        return {
            eventInfo: event,
            participantStats: { registered: 0, totalAccredited: 0, accredited: 0, accreditedGuests: 0, attendanceRate: 0 },
            scheduleStats: [],
            awardStats: { assigned: 0, delivered: 0, deliveryRate: 0, pending: 0 },
            accreditationTimeline: []
        };
    }

    // 2. Batch: Get Accreditation counts per schedule (Unique participants/guests)
    const accreditationCounts = await Accreditation.findAll({
        attributes: [
            ['event_schedule_id', 'eventScheduleId'],
            [fn('COUNT', col('id')), 'total'],
            [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'participants'],
            [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'guests']
        ],
        where: {
            eventScheduleId: { [Op.in]: scheduleIds }
        },
        group: ['event_schedule_id'],
        raw: true
    }) as unknown as Array<{ eventScheduleId: string, total: number, participants: number, guests: number }>;

    const accMap = new Map(accreditationCounts.map(a => [a.eventScheduleId, a]));

    // 3. Batch: Get Registered Participants per schedule 
    const registrationCounts = await ParticipantSchedule.findAll({
        attributes: [
            ['schedule_id', 'scheduleId'],
            [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'count']
        ],
        where: {
            scheduleId: { [Op.in]: scheduleIds }
        },
        group: ['schedule_id'],
        raw: true
    }) as unknown as Array<{ scheduleId: string, count: number }>;

    const regMap = new Map(registrationCounts.map(r => [r.scheduleId, r.count]));

    // 3b. Batch: Get Registered Guests per schedule
    const guestRegistrationQuery = `
        SELECT ps.schedule_id as "scheduleId", COUNT(g.id)::int as count
        FROM participant_schedules ps
        INNER JOIN guests g ON ps.participant_id = g.participant_id
        WHERE ps.schedule_id IN (:scheduleIds)
        GROUP BY ps.schedule_id
    `;

    const guestRegistrationCounts = await sequelize.query<{ scheduleId: string; count: number }>(guestRegistrationQuery, {
        replacements: { scheduleIds },
        type: QueryTypes.SELECT
    });
    
    const guestRegMap = new Map(guestRegistrationCounts.map(r => [r.scheduleId, r.count]));

    // 4. Batch: Get Awards Delivered per schedule
    const awardsQuery = `
        SELECT ps.schedule_id as "scheduleId", COUNT(pa.id)::int as count
        FROM participant_schedules ps
        INNER JOIN participant_awards pa ON ps.participant_id = pa.participant_id
        INNER JOIN awards a ON pa.award_id = a.id
        WHERE ps.schedule_id IN (:scheduleIds)
          AND a.event_id = :eventId
          AND pa.delivered_at IS NOT NULL
        GROUP BY ps.schedule_id
    `;
    
    const awardsCounts = await sequelize.query<{ scheduleId: string; count: number }>(awardsQuery, {
        replacements: { scheduleIds, eventId },
        type: QueryTypes.SELECT
    });

    const awardMap = new Map(awardsCounts.map(a => [a.scheduleId, a.count]));

    // 5. Build Schedule Details
    const scheduleDetails = schedules.map(s => {
        const accData = accMap.get(s.id) || { total: 0, participants: 0, guests: 0 };
        const registeredParticipants = Number(regMap.get(s.id) || 0);
        const registeredGuests = Number(guestRegMap.get(s.id) || 0);
        const registeredTotal = registeredParticipants + registeredGuests;
        const awardsDelivered = Number(awardMap.get(s.id) || 0);
        const accTotal = Number(accData.total) || 0;
        const capacity = s.maxCapacity ?? event.maxCapacity ?? 0;

        return {
            scheduleName: s.scheduleName,
            startDateTime: s.startDateTime,
            endDateTime: s.endDateTime,
            capacity,
            registered: registeredTotal,
            registeredTotal,
            registeredParticipants,
            registeredGuests,
            accreditedTotal: accTotal,
            accreditedParticipants: Number(accData.participants) || 0,
            accreditedGuests: Number(accData.guests) || 0,
            awardsDelivered,
            capacityUsedPercentage: capacity > 0 ? (accTotal / capacity) * 100 : 0,
        };
    });

    // 6. Event Level Stats
    const totalParticipants = await Participant.count({
        include: [{
            model: EventSchedule,
            as: 'schedules',
            where: { eventId },
            required: true
        }],
        distinct: true,
        col: 'id'
    });

    // Efficiently get unique accredited participants and guests across the entire event
    const uniqueEventStats = await Accreditation.findOne({
        attributes: [
            [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'uniqueParticipants'],
            [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'uniqueGuests']
        ],
        include: [{
            model: EventSchedule,
            where: { eventId },
            attributes: []
        }],
        raw: true
    }) as any;

    const totalAccreditedParticipants = parseInt(uniqueEventStats?.uniqueParticipants || '0', 10);
    const totalAccreditedGuests = parseInt(uniqueEventStats?.uniqueGuests || '0', 10);

    const awardsAssigned = await ParticipantAward.count({ include: [{ model: Award, where: { eventId }, attributes: [] }] });
    const awardsDeliveredTotal = await ParticipantAward.count({
      where: { deliveredAt: { [Op.ne]: null } },
      include: [{ model: Award, where: { eventId }, attributes: [] }]
    });

    // 7. Timeline
    const accreditations = await Accreditation.findAll({
        attributes: ['checkInTime'],
        include: [{ model: EventSchedule, where: { eventId }, attributes: [] }],
        order: [['checkInTime', 'ASC']],
        raw: true
    });

    let accreditationTimeline: { hour: string, count: number }[] = [];
    if (accreditations.length > 0) {
        const firstTime = accreditations[0].checkInTime;
        const lastTime = accreditations[accreditations.length - 1].checkInTime;
        
        const hourMap = new Map<string, number>();
        
        const interval = eachHourOfInterval({ start: startOfHour(firstTime), end: endOfHour(lastTime) });
        interval.forEach(d => hourMap.set(format(d, 'yyyy-MM-dd HH:mm'), 0));

        accreditations.forEach((acc) => {
            const key = format(startOfHour(acc.checkInTime), 'yyyy-MM-dd HH:mm');
            if (hourMap.has(key)) {
                hourMap.set(key, (hourMap.get(key) || 0) + 1);
            }
        });

        accreditationTimeline = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));
    }

    return {
      eventInfo: event,
      participantStats: {
        registered: totalParticipants,
        totalAccredited: totalAccreditedParticipants + totalAccreditedGuests,
        accredited: totalAccreditedParticipants,
        accreditedGuests: totalAccreditedGuests,
        attendanceRate: totalParticipants > 0 ? (totalAccreditedParticipants / totalParticipants) * 100 : 0,
      },
      scheduleStats: scheduleDetails,
      awardStats: {
        assigned: awardsAssigned,
        delivered: awardsDeliveredTotal,
        deliveryRate: awardsAssigned > 0 ? (awardsDeliveredTotal / awardsAssigned) * 100 : 0,
        pending: awardsAssigned - awardsDeliveredTotal,
      },
      accreditationTimeline,
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
        totalParticipants: await Participant.count({
          include: [{
            model: EventSchedule,
            as: 'schedules',
            where: { eventId },
            required: true
          }],
          distinct: true,
          col: 'id'
        }),
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

  async getRealTimeStats(eventId: string) {
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

  async getGeneralReport(eventId: string) {
    const query = `
        SELECT 
            p.first_name as "Nombre",
            p.last_name as "Apellido",
            p.document_number as "Documento",
            p.numero_sap as "Número SAP",
            p.phone as "Teléfono",
            p.email as "Email",
            p.dietary_preference as "Dieta",
            p.dietary_comments as "Comentarios Dieta",
            ps.created_at as "registrationDate",
            es.start_date_time as "eventDate",
            CASE WHEN acc.id IS NOT NULL THEN 'Sí' ELSE 'No' END as "Asistencia",
            acc.check_in_time as "checkInTime",
            (SELECT COUNT(*) FROM guests g WHERE g.participant_id = p.id) as "Cant. Invitados",
            (SELECT COUNT(*) FROM accreditations acc_g 
             INNER JOIN guests g ON acc_g.guest_id = g.id 
             WHERE g.participant_id = p.id AND acc_g.event_schedule_id = es.id) as "Cant. Invitados Asistentes",
            (SELECT STRING_AGG(a.name, ', ')
             FROM participant_awards pa
             INNER JOIN awards a ON pa.award_id = a.id
             WHERE pa.participant_id = p.id AND a.event_id = :eventId AND pa.delivered_at IS NOT NULL) as "awardName"
        FROM participants p
        INNER JOIN participant_schedules ps ON p.id = ps.participant_id
        INNER JOIN event_schedules es ON ps.schedule_id = es.id
        LEFT JOIN accreditations acc ON p.id = acc.participant_id AND es.id = acc.event_schedule_id
        WHERE es.event_id = :eventId
        ORDER BY p.last_name, p.first_name, es.start_date_time
    `;

    const results = await sequelize.query(query, {
        replacements: { eventId },
        type: QueryTypes.SELECT
    });

    return results.map((row: any) => ({
        "Nombre": row["Nombre"],
        "Apellido": row["Apellido"],
        "Documento": row["Documento"],
        "Número SAP": row["Número SAP"],
        "Teléfono": row["Teléfono"],
        "Email": row["Email"],
        "Dieta": row["Dieta"],
        "Comentarios Dieta": row["Comentarios Dieta"],
        "Fecha Inscripción": row["registrationDate"] ? format(new Date(row["registrationDate"]), 'dd/MM/yyyy HH:mm') : '',
        "Fecha Evento": row["eventDate"] ? format(new Date(row["eventDate"]), 'dd/MM/yyyy') : '',
        "Asistencia": row["Asistencia"],
        "Hora Acreditación": row["checkInTime"] ? format(new Date(row["checkInTime"]), 'HH:mm:ss') : '',
        "Cant. Invitados": row["Cant. Invitados"],
        "Cant. Invitados Asistentes": row["Cant. Invitados Asistentes"],
        "Premio": row["awardName"] || 'No'
    }));
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
