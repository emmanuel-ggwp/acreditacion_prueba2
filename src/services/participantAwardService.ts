
import { z } from 'zod';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import { 
  ParticipantAward, 
  Participant, 
  Award, 
  EventSchedule, 
  User, 
  Event 
} from '@/models/index';
import { assignAwardSchema } from '@/utils/validators/awardSchemas';

export class ParticipantAwardService {

  async assignAward(participantId: number, awardId: number, assignedBy: string, notes?: string) {

    return sequelize.transaction(async (transaction) => {
      const award = await Award.findByPk(awardId, { lock: transaction.LOCK.UPDATE, transaction });
      if (!award) {
        throw new Error('Award not found.');
      }

      const participant = await Participant.findByPk(participantId, { transaction });
      if (!participant) {
        throw new Error('Participant not found.');
      }
      
      const isParticipantInEvent = await EventSchedule.count({
        where: { eventId: award.eventId },
        include: [{
            model: Participant,
            where: { id: participantId },
            required: true,
            through: { attributes: [] }
        }],
        transaction
      });

      if (isParticipantInEvent === 0) {
          throw new Error('Participant and Award do not belong to the same event.');
      }

      const assignedCount = await ParticipantAward.count({ where: { awardId }, transaction });
      if (assignedCount >= award.quantity) {
        throw new Error('Award is out of stock.');
      }

      const existingAssignment = await ParticipantAward.findOne({ where: { participantId, awardId }, transaction });
      if (existingAssignment) {
          throw new Error('This participant has already been assigned this award.');
      }

      const participantAward = await ParticipantAward.create({
        participantId,
        awardId,
        assignedBy,
        notes,
      }, { transaction });

      return participantAward;
    });
  }

  async deliverAward(participantAwardId: number, deliveredBy: string) {
    const participantAward = await ParticipantAward.findByPk(participantAwardId);
    if (!participantAward) {
      throw new Error('Award assignment not found.');
    }
    if (participantAward.deliveredAt) {
      throw new Error('Award has already been delivered.');
    }

    participantAward.deliveredAt = new Date();
    participantAward.deliveredBy = deliveredBy;
    await participantAward.save();

    return participantAward;
  }

  async cancelAwardAssignment(participantAwardId: number, userId: string) {
    const participantAward = await ParticipantAward.findByPk(participantAwardId);
    if (!participantAward) {
      throw new Error('Award assignment not found.');
    }
    if (participantAward.deliveredAt) {
      throw new Error('Cannot cancel an award assignment that has already been delivered.');
    }
    // Add permission check for userId if necessary

    await participantAward.destroy();
    return { message: 'Award assignment cancelled successfully.' };
  }

  async listParticipantAwards(participantId: number) {
    return ParticipantAward.findAll({
      where: { participantId },
      include: [
        { model: Award, attributes: ['name', 'description'] },
        { model: User, as: 'Assigner', attributes: ['id', 'firstName'] },
        { model: User, as: 'Deliverer', attributes: ['id', 'firstName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async listAwardAssignments(awardId: string, delivered?: boolean) {
    const where: any = { awardId };
    if (delivered === true) {
      where.deliveredAt = { [Op.ne]: null };
    } else if (delivered === false) {
      where.deliveredAt = { [Op.is]: null };
    }

    return ParticipantAward.findAll({
      include: [{
        model: EventSchedule,
        where: { eventId },
        required: true
      }],
      distinct: true,
      col: 'id'
   
      where,
      include: [
        { model: Participant, attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'ASC']],
    });
  }

  async getAwardStatistics(eventId: string) {
    const awards = await Award.findAll({ where: { eventId } });
    const totalParticipants = await Participant.count({ where: { eventId } });
    
    const stats = await Promise.all(awards.map(async (award) => {
        const assigned = await ParticipantAward.count({ where: { awardId: award.id } });
        const delivered = await ParticipantAward.count({ where: { awardId: award.id, deliveredAt: { [Op.ne]: null } } });
        return {
            awardId: award.id,
            name: award.name,
            totalStock: award.quantity,
            assigned,
            delivered,
            available: award.quantity - assigned,
        };
    }));

    const awardedParticipantsCount = (await ParticipantAward.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('participantId')), 'participantId']],
        include: [{ model: Award, where: { eventId }, attributes: [] }],
    })).length;

    return {
        awardDetails: stats,
        participantSummary: {
            totalParticipants,
            awardedParticipants: awardedParticipantsCount,
            percentageAwarded: totalParticipants > 0 ? (awardedParticipantsCount / totalParticipants) * 100 : 0,
        }
    };
  }
}

export const participantAwardService = new ParticipantAwardService();
