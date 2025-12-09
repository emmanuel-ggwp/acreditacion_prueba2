import { z } from 'zod';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import { 
  Accreditation, 
  Participant, 
  Guest, 
  EventSchedule, 
  Event, 
  User,
  ParticipantSchedule
} from '@/models/index';
import { bulkAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import { auditLogService } from './auditLogService';

export class AccreditationService {

  private async _verifyAndLock(
    { participantId, guestId, eventScheduleId }: { participantId?: string; guestId?: string; eventScheduleId: string },
    transaction: Transaction
  ) {
    const schedule = await EventSchedule.findByPk(eventScheduleId, {
      include: [Event],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    const event = (schedule as any)?.Event;

    if (!schedule || !event) {
      throw new Error('Event schedule not found or is not associated with an event.');
    }
    if (!schedule.isActive || !event.isActive) {
      throw new Error('The event or schedule is not active.');
    }

    // Validate that the person belongs to the event
    let person;
    if (participantId) {
        person = await Participant.findByPk(participantId, { transaction });
        
        if (!person) {
             throw new Error('Participant not found.');
        }

        const isParticipantInEvent = await EventSchedule.count({
            where: { eventId: schedule.eventId },
            include: [{
                model: Participant,
                where: { id: participantId },
                required: true,
                through: { attributes: [] }
            }],
            transaction
        });

        if (isParticipantInEvent === 0) {
            throw new Error('Participant does not belong to this event.');
        }

    } else if (guestId) {
        person = await Guest.findByPk(guestId, { include: [{ model: Participant, as: 'participant' }], transaction });
        const guestParticipant = (person as any)?.participant;
        
        if (!person || !guestParticipant) {
             throw new Error('Guest or associated participant not found.');
        }

        const isParticipantInEvent = await EventSchedule.count({
            where: { eventId: schedule.eventId },
            include: [{
                model: Participant,
                where: { id: guestParticipant.id },
                required: true,
                through: { attributes: [] }
            }],
            transaction
        });

        if (isParticipantInEvent === 0) {
            throw new Error('Guest\'s participant does not belong to this event.');
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

      // Update ParticipantSchedule attended status
      await ParticipantSchedule.update(
        { attended: true, attendedAt: new Date() },
        { 
          where: { 
            participantId, 
            scheduleId: eventScheduleId 
          },
          transaction 
        }
      );

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

  async checkOut(accreditationId: string, checkedOutBy: string) {
    const accreditation = await Accreditation.findByPk(accreditationId);
    if (!accreditation) {
      throw new Error('Accreditation not found');
    }
    if (!accreditation.checkInTime) {
      throw new Error('Cannot check out without a check-in time.');
    }
    if (accreditation.checkOutTime) {
        throw new Error('Already checked out.');
    }
    accreditation.checkOutTime = new Date();
    (accreditation as any).checkedOutBy = checkedOutBy;
    await accreditation.save();

    await auditLogService.log({
      userId: checkedOutBy,
      action: 'UPDATE',
      entity: 'Accreditation',
      entityId: accreditation.id,
      details: { checkOutTime: accreditation.checkOutTime },
    });

    return accreditation;
  }

  async getAccreditationById(accreditationId: string) {
    const accreditation = await Accreditation.findByPk(accreditationId, {
      attributes: ['id', 'checkInTime', 'checkOutTime', 'notes'],
      include: [
        { 
          model: Participant, 
          attributes: ['id', 'firstName', 'lastName', 'email']
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

  async getAccreditationsBySchedule(scheduleId: string) {
    return Accreditation.findAll({
        where: { eventScheduleId: scheduleId },
        include: [Participant, Guest],
        order: [['checkInTime', 'ASC']]
    });
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
