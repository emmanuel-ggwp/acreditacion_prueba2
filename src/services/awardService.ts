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

    // `eventId` no se cambia por edición (mass-assignment): un premio no se mueve
    // de evento. El create sí lo fija desde la ruta.
    const { eventId: _ignoredEventId, ...rest } = validatedData as any;
    const before: any = JSON.parse(JSON.stringify(award.get({ plain: true })));
    await award.update(rest);
    if (userId) {
      const changes = auditLogService.buildChanges(before, award.get({ plain: true }), Object.keys(rest));
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
        const assignedCount = await ParticipantAward.count({ where: { awardId: award.id } });
        const deliveredCount = await ParticipantAward.count({ where: { awardId: award.id, deliveredAt: { [Op.ne]: null } } });
        return {
            ...award.toJSON(),
            assignedCount,
            deliveredCount,
            availableStock: award.quantity - assignedCount,
        };
    }));

    return awardsWithStock;
  }

  async getAwardById(awardId: string) {
    return Award.findByPk(awardId);
  }
  // Nota: la asignación de premios vive en participantAwardService.assignAward, que
  // bloquea la fila del Award (LOCK.UPDATE), valida stock/duplicado/pertenencia y ahora
  // se apoya en el índice único (participant_id, award_id). Se eliminaron las versiones
  // muertas assignAwardToParticipant/getAvailableStock de este servicio (check-then-act
  // inseguro, sin uso).
}

export const awardService = new AwardService();
