
/**
 * Servicio de asignación y entrega de premios a participantes (tabla puente ParticipantAward).
 *
 * Responsable del ciclo de vida de un premio asignado a una persona: asignar (con control de
 * stock y unicidad), entregar, cancelar, y listar/estadísticas. Las operaciones críticas usan
 * transacción con bloqueo de fila (`LOCK.UPDATE`) para serializar concurrencia: asignar bloquea
 * el premio para respetar el stock, y entregar bloquea la asignación para evitar doble entrega.
 * Se apoya además en el índice único (participant_id, award_id).
 */
import { z } from 'zod';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import ParticipantAward from '@/models/ParticipantAward';
import Participant from '@/models/Participant';
import Award from '@/models/Award';
import { assignAwardSchema } from '@/utils/validators/awardSchemas';
import User from '@/models/User';
import Event from '@/models/Event';

/**
 * Lógica de negocio para asignar, entregar, cancelar, listar y resumir los premios asignados
 * a los participantes, con control de stock, duplicados y concurrencia mediante transacciones.
 */
export class ParticipantAwardService {

  /**
   * Asigna un premio a un participante dentro de una transacción, bloqueando la fila del premio
   * (`LOCK.UPDATE`) para respetar el stock frente a asignaciones concurrentes. Valida stock,
   * pertenencia al mismo evento y que no exista ya la asignación.
   *
   * @param participantId - ID del participante que recibe el premio.
   * @param awardId - ID del premio a asignar.
   * @param assignedBy - ID del usuario que realiza la asignación (queda en `assignedBy`).
   * @param notes - Notas opcionales de la asignación.
   * @returns La asignación (`ParticipantAward`) creada.
   * @throws {Error} `'Award not found.'` si el premio no existe.
   * @throws {Error} `'Participant not found.'` si el participante no existe.
   * @throws {Error} `'Participant and Award do not belong to the same event.'` si no comparten evento.
   * @throws {Error} `'Award is out of stock.'` si ya se asignaron tantos premios como la cantidad disponible.
   * @throws {Error} `'This participant has already been assigned this award.'` si la asignación ya existe.
   */
  async assignAward(participantId: string, awardId: string, assignedBy: string, notes?: string | null) {

    return sequelize.transaction(async (transaction) => {
      const award = await Award.findByPk(awardId, { lock: transaction.LOCK.UPDATE, transaction });
      if (!award) {
        throw new Error('Award not found.');
      }

      const participant = await Participant.findByPk(participantId, { transaction });
      if (!participant) {
        throw new Error('Participant not found.');
      }
      
      if (participant.eventId !== award.eventId) {
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

  /**
   * Marca una asignación como entregada (fija `deliveredAt` y `deliveredBy`) dentro de una
   * transacción con bloqueo de fila, de modo que dos entregas concurrentes se serializan y la
   * segunda ve el premio ya entregado.
   *
   * @param participantAwardId - ID de la asignación (ParticipantAward) a entregar.
   * @param deliveredBy - ID del usuario que registra la entrega.
   * @returns La asignación (`ParticipantAward`) actualizada con la entrega.
   * @throws {Error} `'Award assignment not found.'` si la asignación no existe.
   * @throws {Error} `'Award has already been delivered.'` si la asignación ya tenía `deliveredAt`.
   */
  async deliverAward(participantAwardId: string, deliveredBy: string) {
    // Transacción + lock de la fila: dos entregas concurrentes del mismo premio se
    // serializan y la segunda ve deliveredAt ya puesto (antes ambas pasaban el chequeo).
    return sequelize.transaction(async (transaction) => {
      const participantAward = await ParticipantAward.findByPk(participantAwardId, { lock: transaction.LOCK.UPDATE, transaction });
      if (!participantAward) {
        throw new Error('Award assignment not found.');
      }
      if (participantAward.deliveredAt) {
        throw new Error('Award has already been delivered.');
      }

      participantAward.deliveredAt = new Date();
      participantAward.deliveredBy = deliveredBy;
      await participantAward.save({ transaction });

      return participantAward;
    });
  }

  /**
   * Cancela (elimina) una asignación de premio que aún no ha sido entregada.
   *
   * @param participantAwardId - ID de la asignación (ParticipantAward) a cancelar.
   * @param userId - ID del usuario que cancela (reservado para futuras validaciones de permiso).
   * @returns Objeto `{ message: 'Award assignment cancelled successfully.' }`.
   * @throws {Error} `'Award assignment not found.'` si la asignación no existe.
   * @throws {Error} `'Cannot cancel an award assignment that has already been delivered.'` si ya fue entregada.
   */
  async cancelAwardAssignment(participantAwardId: string, userId: string) {
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

  /**
   * Lista los premios asignados a un participante, incluyendo el premio y los usuarios que
   * asignaron y entregaron, ordenados del más reciente al más antiguo.
   *
   * @param participantId - ID del participante cuyas asignaciones se listan.
   * @returns Arreglo de asignaciones (`ParticipantAward`) con `Award`, `Assigner` y `Deliverer`.
   */
  async listParticipantAwards(participantId: string) {
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

  /**
   * Lista las asignaciones de un premio, opcionalmente filtradas por estado de entrega,
   * ordenadas de la más antigua a la más reciente.
   *
   * @param awardId - ID del premio cuyas asignaciones se listan.
   * @param delivered - Si es `true`, solo entregadas; si es `false`, solo pendientes; si se omite, todas.
   * @returns Arreglo de asignaciones (`ParticipantAward`) con los datos del participante.
   */
  async listAwardAssignments(awardId: string, delivered?: boolean) {
    const where: any = { awardId };
    if (delivered === true) {
      where.deliveredAt = { [Op.ne]: null };
    } else if (delivered === false) {
      where.deliveredAt = { [Op.is]: null };
    }

    return ParticipantAward.findAll({
      where,
      include: [
        { model: Participant, attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'ASC']],
    });
  }

  /**
   * Calcula estadísticas de premios de un evento: por cada premio su stock, asignados,
   * entregados y disponibles; y un resumen de participantes premiados frente al total.
   *
   * @param eventId - ID del evento del que se calculan las estadísticas.
   * @returns Objeto con `awardDetails` (detalle por premio) y `participantSummary`
   *          (`totalParticipants`, `awardedParticipants`, `percentageAwarded`).
   */
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
