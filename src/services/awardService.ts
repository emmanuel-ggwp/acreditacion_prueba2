import { z } from 'zod';
import { Op } from 'sequelize';
import { Award, ParticipantAward } from '@/models/index';
import { createAwardSchema, updateAwardSchema } from '@/utils/validators/awardSchemas';
import { auditLogService } from './auditLogService';

export class AwardService {
  async createAward(eventId: string, data: z.infer<typeof createAwardSchema>, createdBy: string) {
    const validatedData = createAwardSchema.parse(data);
    const award = await Award.create({ ...validatedData, eventId, createdBy });
    if (createdBy) {
      await auditLogService.log({ userId: createdBy, action: 'CREATE', entity: 'Award', entityId: award.id, details: { name: (award as any).name } });
    }
    return award;
  }

  async updateAward(awardId: string, data: z.infer<typeof updateAwardSchema>, userId: string) {
    const validatedData = updateAwardSchema.parse(data);
    const award = await Award.findByPk(awardId);
    if (!award) {
      throw new Error('Award not found');
    }

    if (validatedData.quantity !== undefined) {
      const assignedCount = await ParticipantAward.count({ where: { awardId } });
      if (validatedData.quantity < assignedCount) {
        throw new Error(`Cannot set quantity below the number of already assigned awards (${assignedCount}).`);
      }
    }

    const before: any = JSON.parse(JSON.stringify(award.get({ plain: true })));
    await award.update(validatedData);
    if (userId) {
      const changes = auditLogService.buildChanges(before, award.get({ plain: true }), Object.keys(validatedData));
      if (Object.keys(changes).length) {
        await auditLogService.log({ userId, action: 'UPDATE', entity: 'Award', entityId: award.id, details: { name: (award as any).name, changes } });
      }
    }
    return award;
  }

  async deleteAward(awardId: string, userId: string, reason?: string) {
    // Basic permission check
    const assignedCount = await ParticipantAward.count({ where: { awardId } });
    if (assignedCount > 0) {
      throw new Error('Cannot delete award with existing assignments.');
    }

    const award = await Award.findByPk(awardId);
    if (!award) {
      throw new Error('Award not found');
    }

    const name = (award as any).name;
    await award.destroy();
    if (userId) {
      await auditLogService.log({ userId, action: 'DELETE', entity: 'Award', entityId: awardId, details: { name, reason: reason || null } });
    }
    return { message: 'Award deleted successfully' };
  }

  async listAwardsByEvent(eventId: string) {
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
}

export const awardService = new AwardService();
