/**
 * Servicio de premios (Award) de un evento.
 *
 * Responsable del CRUD de premios y de exponer su stock (cantidad total, asignados y
 * entregados). NO asigna premios a participantes: eso vive en
 * {@link ParticipantAwardService.assignAward}, que bloquea la fila del premio y valida
 * stock, duplicado y pertenencia al evento. Toda operación de escritura registra auditoría.
 */
import { z } from 'zod';
import { Op } from 'sequelize';
import { Award, ParticipantAward } from '@/models/index';
import { createAwardSchema, updateAwardSchema } from '@/utils/validators/awardSchemas';
import { auditLogService } from './auditLogService';

/**
 * Lógica de negocio para crear, editar, eliminar y consultar premios de un evento,
 * controlando el stock frente a las asignaciones existentes y dejando registro de auditoría.
 */
export class AwardService {
  /**
   * Valida los datos con `createAwardSchema` y crea un premio asociado al evento indicado.
   *
   * @param eventId - ID del evento al que pertenece el premio (se fija desde la ruta, no por el cuerpo).
   * @param data - Datos del premio a crear; se validan con `createAwardSchema`.
   * @param createdBy - ID del usuario que crea el premio; si viene, se registra en auditoría (acción `CREATE`).
   * @returns El premio (`Award`) recién creado.
   * @throws {z.ZodError} Si `data` no cumple `createAwardSchema`.
   */
  async createAward(eventId: string, data: z.infer<typeof createAwardSchema>, createdBy: string) {
    const validatedData = createAwardSchema.parse(data);
    const award = await Award.create({ ...validatedData, eventId, createdBy });
    if (createdBy) {
      await auditLogService.log({ userId: createdBy, action: 'CREATE', entity: 'Award', entityId: award.id, details: { name: (award as any).name } });
    }
    return award;
  }

  /**
   * Valida y actualiza un premio. Si se cambia `quantity`, impide dejarla por debajo de los
   * premios ya asignados. El `eventId` nunca se modifica por edición (un premio no cambia de evento).
   *
   * @param awardId - ID del premio a actualizar.
   * @param data - Campos a modificar; se validan con `updateAwardSchema`.
   * @param userId - ID del usuario que edita; si viene y hubo cambios reales, se registra en auditoría (acción `UPDATE`).
   * @returns El premio (`Award`) actualizado.
   * @throws {z.ZodError} Si `data` no cumple `updateAwardSchema`.
   * @throws {Error} `'Award not found'` si el premio no existe.
   * @throws {Error} `'Cannot set quantity below the number of already assigned awards (N).'` si la nueva `quantity` es menor que la cantidad ya asignada.
   */
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

  /**
   * Elimina un premio, siempre que no tenga asignaciones (borrado real). Registra la eliminación en auditoría.
   *
   * @param awardId - ID del premio a eliminar.
   * @param userId - ID del usuario que elimina; si viene, se registra en auditoría (acción `DELETE`).
   * @param reason - Motivo opcional de la eliminación (queda en el detalle de auditoría).
   * @returns Objeto `{ message: 'Award deleted successfully' }`.
   * @throws {Error} `'Cannot delete award with existing assignments.'` si el premio tiene asignaciones en `participant_awards`.
   * @throws {Error} `'Award not found'` si el premio no existe.
   */
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

  /**
   * Lista los premios de un evento agregando su stock: asignados, entregados y disponibles.
   *
   * @param eventId - ID del evento cuyos premios se listan.
   * @returns Arreglo de premios en JSON, cada uno con `assignedCount`, `deliveredCount` y `availableStock` (cantidad − asignados).
   */
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

  /**
   * Obtiene un premio por su ID.
   *
   * @param awardId - ID del premio a buscar.
   * @returns El `Award` encontrado, o `null` si no existe.
   */
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
