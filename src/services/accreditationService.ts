import { z } from 'zod';
import { Op, Transaction, fn, col } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import Accreditation from '@/models/Accreditation';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import EventSchedule from '@/models/EventSchedule';
import Event from '@/models/Event';
import { bulkAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import User from '@/models/User';
import { auditLogService } from './auditLogService';
import { dietaryFull, dietaryLabel } from '@/utils/dietary';

export class AccreditationService {

  private async _verifyAndLock(
    { participantId, guestId, eventScheduleId }: { participantId?: string; guestId?: string; eventScheduleId: string },
    transaction: Transaction
  ) {
    // Bloqueamos SOLO la fila del horario (sin include): Postgres no permite
    // FOR UPDATE sobre el lado nulable de un outer join. El evento se trae aparte.
    const schedule = await EventSchedule.findByPk(eventScheduleId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!schedule) {
      throw new Error('Event schedule not found.');
    }

    const event = await Event.findByPk(schedule.eventId, { transaction });

    if (!event) {
      throw new Error('Event schedule is not associated with an event.');
    }
    if (!schedule.isActive || !event.isActive) {
      throw new Error('The event or schedule is not active.');
    }

    // Validate that the person belongs to the event
    let person;
    if (participantId) {
        person = await Participant.findByPk(participantId, { transaction });
        if (!person || person.eventId !== schedule.eventId) {
            throw new Error('Participant not found or does not belong to this event.');
        }
    } else if (guestId) {
        person = await Guest.findByPk(guestId, { include: [{ model: Participant, as: 'participant' }], transaction });
        const guestParticipant = (person as any)?.participant;
        if (!person || guestParticipant?.eventId !== schedule.eventId) {
            throw new Error('Guest not found or does not belong to this event.');
        }
    } else {
        throw new Error('Participant or Guest ID is required.');
    }

    // Check capacity
    const capacity = schedule.maxCapacity ?? event.maxCapacity;
    if (capacity) {
      const accreditedCount = await Accreditation.count({ where: { eventScheduleId }, transaction });
      if (accreditedCount >= capacity) {
        throw new Error('Event schedule has reached its maximum capacity.');
      }
    }

    // Check for prior accreditation
    const idToCheck = participantId || guestId;
    const type = participantId ? 'participant' : 'guest';
    const { isAccredited } = await this.verifyAccreditation(type, idToCheck!, eventScheduleId, transaction);
    if (isAccredited) {
      throw new Error('This person has already been accredited for this schedule.');
    }

    // Update schedule status to 'accrediting' if it is 'published'
    if (schedule.status === 'published') {
      await schedule.update({ status: 'accrediting' }, { transaction });
    }
    
    return { schedule, person };
  }

  async accreditParticipant(participantId: string, eventScheduleId: string, accreditedBy: string, notes?: string) {
    
    const transaction = await sequelize.transaction();
    try {
      await this._verifyAndLock({ participantId, eventScheduleId }, transaction);

      const accreditation = await Accreditation.create({
        participantId,
        eventScheduleId,
        accreditedBy,
        checkInTime: new Date(),
        notes,
      }, { transaction });

      await auditLogService.log({
        userId: accreditedBy,
        action: 'CREATE',
        entity: 'Accreditation',
        entityId: accreditation.id,
        details: { participantId, eventScheduleId },
      });

      await transaction.commit();
      return this.getAccreditationById(accreditation.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async accreditGuest(guestId: string, eventScheduleId: string, accreditedBy: string, notes?: string) {

    const transaction = await sequelize.transaction();
    try {
      await this._verifyAndLock({ guestId, eventScheduleId }, transaction);

      const accreditation = await Accreditation.create({
        guestId,
        eventScheduleId,
        accreditedBy,
        checkInTime: new Date(),
        notes,
      }, { transaction });

      await auditLogService.log({
        userId: accreditedBy,
        action: 'CREATE',
        entity: 'Accreditation',
        entityId: accreditation.id,
        details: { guestId, eventScheduleId },
      });

      await transaction.commit();
      return this.getAccreditationById(accreditation.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async bulkAccredit(accreditations: z.infer<typeof bulkAccreditationSchema>, accreditedBy: string) {
    const validatedData = bulkAccreditationSchema.parse(accreditations);
    const results = { created: 0, errors: [] as any[] };
    const transaction = await sequelize.transaction();

    try {
        for (const item of validatedData) {
            try {
                if (item.type === 'participant') {
                    await this._verifyAndLock({ participantId: item.participantId, eventScheduleId: item.eventScheduleId }, transaction);
                    await Accreditation.create({ participantId: item.participantId, eventScheduleId: item.eventScheduleId, accreditedBy, checkInTime: new Date() }, { transaction });
                } else {
                    await this._verifyAndLock({ guestId: item.guestId, eventScheduleId: item.eventScheduleId }, transaction);
                    await Accreditation.create({ guestId: item.guestId, eventScheduleId: item.eventScheduleId, accreditedBy, checkInTime: new Date() }, { transaction });
                }
                results.created++;
            } catch (error: any) {
                results.errors.push({ data: item, error: error.message });
            }
        }
        await transaction.commit();
        return results;
    } catch (error: any) {
        await transaction.rollback();
        throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async getAccreditationById(accreditationId: string) {
    const accreditation = await Accreditation.findByPk(accreditationId, {
      attributes: ['id', 'checkInTime', 'checkOutTime', 'notes'],
      include: [
        {
          model: Participant,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          include: [{ model: Event, as: 'event', attributes: ['id', 'name'] }]
        },
        {
          model: Guest,
          attributes: ['id', 'firstName', 'lastName'],
          include: [{ model: Participant, as: 'participant', attributes: ['id', 'firstName', 'lastName'] }]
        },
        { model: EventSchedule, attributes: ['id', 'scheduleName', 'startDateTime', 'endDateTime'] },
        { model: User, as: 'accreditedByUser', attributes: ['id', 'firstName', 'lastName'] }
      ],
    });
    if (!accreditation) {
      throw new Error('Accreditation not found');
    }
    return accreditation;
  }

  async listAccreditations(filters: { eventId?: string, scheduleId?: string, page?: number, limit?: number }) {
    const { page = 1, limit = 10, eventId, scheduleId } = filters;
    const where: any = {};
    const scheduleWhere: any = {};

    if (scheduleId) where.eventScheduleId = scheduleId;
    if (eventId) scheduleWhere.eventId = eventId;

    const { count, rows } = await Accreditation.findAndCountAll({
      where,
      attributes: ['id', 'checkInTime', 'checkOutTime'],
      include: [
        { 
          model: EventSchedule, 
          where: scheduleWhere, 
          required: !!eventId, 
          attributes: ['id', 'scheduleName'] 
        },
        { 
          model: Participant, 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: Guest, 
          attributes: ['id', 'firstName', 'lastName'] 
        },
        { 
          model: User, 
          as: 'accreditedByUser', 
          attributes: ['id', 'firstName'] 
        }
      ],
      limit,
      offset: (page - 1) * limit,
      order: [['checkInTime', 'DESC']],
    });
    return { accreditations: rows, total: count, page, limit };
  }

  // Estadísticas para el panel de acreditación de un horario:
  // acreditados (participantes), invitados acreditados, total, y premiados del evento.
  async getScheduleStats(scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const rows = await Accreditation.findAll({
      where: { eventScheduleId: scheduleId },
      attributes: [
        [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'participants'],
        [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'guests'],
      ],
      raw: true,
    }) as unknown as Array<{ participants: any; guests: any }>;

    const participants = Number(rows[0]?.participants || 0);
    const guests = Number(rows[0]?.guests || 0);
    const awarded = await Participant.count({ where: { eventId: (schedule as any).eventId, isAwarded: true } });

    return { participants, guests, total: participants + guests, awarded };
  }

  // Resumen de asistencia por fecha del evento: participantes e invitados acreditados
  // en cada horario, más los totales generales.
  async getEventScheduleStats(eventId: string) {
    const schedules = await EventSchedule.findAll({
      where: { eventId },
      order: [['startDateTime', 'ASC']],
    });
    const scheduleIds = schedules.map((s: any) => s.id);

    const counts: Record<string, { participants: number; guests: number }> = {};
    if (scheduleIds.length) {
      const rows = await Accreditation.findAll({
        where: { eventScheduleId: { [Op.in]: scheduleIds } },
        attributes: [
          'eventScheduleId',
          [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'participants'],
          [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'guests'],
        ],
        group: ['eventScheduleId'],
        raw: true,
      }) as unknown as Array<{ eventScheduleId: string; participants: any; guests: any }>;
      for (const r of rows) {
        counts[r.eventScheduleId] = { participants: Number(r.participants || 0), guests: Number(r.guests || 0) };
      }
    }

    const perSchedule = schedules.map((s: any) => {
      const c = counts[s.id] || { participants: 0, guests: 0 };
      return {
        scheduleId: s.id,
        label: s.scheduleName,
        startDateTime: s.startDateTime,
        location: s.location,
        participants: c.participants,
        guests: c.guests,
        total: c.participants + c.guests,
      };
    });

    const totals = perSchedule.reduce(
      (acc, s) => ({
        participants: acc.participants + s.participants,
        guests: acc.guests + s.guests,
        total: acc.total + s.total,
      }),
      { participants: 0, guests: 0, total: 0 }
    );

    return { perSchedule, totals };
  }

  // Lista de premiados del evento con su estado de acreditación en el horario dado.
  async getAwardedList(scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const eventId = (schedule as any).eventId;

    const awarded = await Participant.findAll({
      where: { eventId, isAwarded: true },
      attributes: ['id', 'firstName', 'lastName', 'documentNumber', 'awardReason'],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const ids = awarded.map((p: any) => p.id);

    const accMap: Record<string, Date> = {};
    if (ids.length) {
      const accs = await Accreditation.findAll({
        where: { eventScheduleId: scheduleId, participantId: { [Op.in]: ids } },
        attributes: ['participantId', 'checkInTime'],
        raw: true,
      }) as unknown as Array<{ participantId: string; checkInTime: Date }>;
      for (const a of accs) accMap[a.participantId] = a.checkInTime;
    }

    return awarded.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      documentNumber: p.documentNumber,
      awardReason: p.awardReason,
      isAccredited: !!accMap[p.id],
      checkInTime: accMap[p.id] || null,
    }));
  }

  // Lista de personas (participantes e invitados) con requerimiento alimentario en el evento
  // del horario dado, con su estado de acreditación en ese horario.
  async getDietaryList(scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const eventId = (schedule as any).eventId;
    const notNone = { [Op.notIn]: ['NONE', ''], [Op.ne]: null } as any;

    const [participants, guests, accs] = await Promise.all([
      Participant.findAll({
        where: { eventId, dietaryPreference: notNone },
        attributes: ['id', 'firstName', 'lastName', 'documentNumber', 'dietaryPreference', 'dietaryComments'],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      }),
      Guest.findAll({
        where: { dietaryPreference: notNone },
        attributes: ['id', 'firstName', 'lastName', 'documentNumber', 'dietaryPreference'],
        include: [{ model: Participant, as: 'participant', where: { eventId }, attributes: ['id', 'firstName', 'lastName'] }],
      }),
      Accreditation.findAll({
        where: { eventScheduleId: scheduleId },
        attributes: ['participantId', 'guestId'],
        raw: true,
      }) as unknown as Array<{ participantId: string | null; guestId: string | null }>,
    ]);

    const accP = new Set(accs.filter((a) => a.participantId).map((a) => a.participantId));
    const accG = new Set(accs.filter((a) => a.guestId).map((a) => a.guestId));

    const items = [
      ...participants.map((p: any) => ({
        id: p.id,
        type: 'Participante' as const,
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        documentNumber: p.documentNumber || null,
        dietary: dietaryFull(p.dietaryPreference, p.dietaryComments),
        belongsTo: null as string | null,
        isAccredited: accP.has(p.id),
      })),
      ...guests.map((g: any) => ({
        id: g.id,
        type: 'Invitado' as const,
        name: `${g.firstName || ''} ${g.lastName || ''}`.trim(),
        documentNumber: g.documentNumber || null,
        dietary: dietaryLabel(g.dietaryPreference),
        belongsTo: g.participant ? `${g.participant.firstName || ''} ${g.participant.lastName || ''}`.trim() : null,
        isAccredited: accG.has(g.id),
      })),
    ];

    return items;
  }

  async verifyAccreditation(type: 'participant' | 'guest', id: string, scheduleId: string, transaction?: Transaction) {
    const whereClause: any = { eventScheduleId: scheduleId };
    if (type === 'participant') {
        whereClause.participantId = id;
    } else {
        whereClause.guestId = id;
    }

    const accreditation = await Accreditation.findOne({ where: whereClause, transaction });
    
    return {
        isAccredited: !!accreditation,
        accreditation,
    };
  }
}

export const accreditationService = new AccreditationService();
