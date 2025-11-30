import { z } from 'zod';
import { Op } from 'sequelize';
import Award from '@/models/Award';
import ParticipantAward from '@/models/ParticipantAward';
import { createAwardSchema, updateAwardSchema } from '@/utils/validators/awardSchemas';

export class AwardService {
  async createAward(eventId: number, data: z.infer<typeof createAwardSchema>, createdBy: string) {
    const validatedData = createAwardSchema.parse(data);
    const award = await Award.create({ ...validatedData, eventId, createdBy });
    return award;
  }

  async updateAward(awardId: string, data: z.infer<typeof updateAwardSchema>, userId: string) {
    const validatedData = updateAwardSchema.parse(data);
    const award = await Award.findByPk(awardId);
    if (!award) {
      throw new Error('Award not found');
    }

    // Basic permission check (can be expanded)
    // For example, check if userId is admin or created the event associated with the award
    
    if (validatedData.quantity !== undefined) {
      const assignedCount = await ParticipantAward.count({ where: { awardId } });
      if (validatedData.quantity < assignedCount) {
        throw new Error(`Cannot set quantity below the number of already assigned awards (${assignedCount}).`);
      }
    }

    await award.update(validatedData);
    return award;
  }

  async deleteAward(awardId: string, userId: string) {
    // Basic permission check
    const assignedCount = await ParticipantAward.count({ where: { awardId } });
    if (assignedCount > 0) {
      throw new Error('Cannot delete award with existing assignments.');
    }

    const award = await Award.findByPk(awardId);
    if (!award) {
      throw new Error('Award not found');
    }

    await award.destroy();
    return { message: 'Award deleted successfully' };
  }

  async listAwardsByEvent(eventId: number) {
    const awards = await Award.findAll({ where: { eventId } });
    
    const awardsWithStock = await Promise.all(awards.map(async (award) => {
        const availableStock = await this.getAvailableStock(award.id);
        return {
            ...award.toJSON(),
            availableStock,
        };
    }));

    return awardsWithStock;
  }

  async getAwardById(awardId: string) {
    return Award.findByPk(awardId);
  }

  async getAvailableStock(awardId: string): Promise<number> {
    const award = await Award.findByPk(awardId);
    if (!award) {
      throw new Error('Award not found');
    }
    const assignedCount = await ParticipantAward.count({ where: { awardId } });
    return award.quantity - assignedCount;
  }

  async assignAwardToParticipant(awardId: string, participantId: string, assignedBy: string, notes?: string) {
    const availableStock = await this.getAvailableStock(awardId);
    if (availableStock <= 0) {
      throw new Error('No available stock for this award.');
    }

    const newAssignment = await ParticipantAward.create({
      awardId,
      participantId,
      assignedBy,
      notes,
    });

    return newAssignment;
  }

  async getAwardsForParticipant(participantId: string) {
    return ParticipantAward.findAll({
      where: { participantId },
      include: [Award],
      order: [['createdAt', 'DESC']],
    });
  }

  async markAwardAsDelivered(participantAwardId: string, deliveredBy: string) {
    const assignment = await ParticipantAward.findByPk(participantAwardId);
    if (!assignment) {
      throw new Error('Award assignment not found.');
    }
    if (assignment.deliveredAt) {
      throw new Error('Award has already been delivered.');
    }

    assignment.deliveredAt = new Date();
    assignment.deliveredBy = deliveredBy;
    await assignment.save();
    return assignment;
  }

  async cancelAwardAssignment(participantAwardId: string, userId: string) {
    const assignment = await ParticipantAward.findByPk(participantAwardId);
    if (!assignment) {
      throw new Error('Award assignment not found.');
    }

    // Add permission check here if necessary, e.g., only admin or assigner can cancel
    
    if (assignment.deliveredAt) {
      throw new Error('Cannot cancel an award that has already been delivered.');
    }

    await assignment.destroy();
    return { message: 'Award assignment cancelled successfully.' };
  }
}

export const awardService = new AwardService();
