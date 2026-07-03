
import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import {
  Participant,
  Guest,
  Award,
  Event,
  EventSchedule,
  ParticipantSchedule,
  Accreditation
} from '@/models/index';
import { createParticipantSchema, updateParticipantSchema, bulkCreateParticipantSchema } from '@/utils/validators/participantSchemas';
import { auditLogService } from './auditLogService';

export class ParticipantService {
  async createParticipant(data: z.infer<typeof createParticipantSchema>, createdBy: string) {
    const validatedData = createParticipantSchema.parse(data);
    const { scheduleIds = [], eventId, ...participantData } = validatedData as any;

    // Determinar el evento: por horario(s) o por eventId explícito (precarga sin fecha).
    let event: any = null;
    let schedules: any[] = [];
    if (scheduleIds.length > 0) {
      schedules = await EventSchedule.findAll({ where: { id: scheduleIds }, include: [{ model: Event }] });
      if (schedules.length !== scheduleIds.length) {
        throw new Error('One or more schedules not found');
      }
      event = (schedules[0] as any).Event;
    }
    if (!event && eventId) {
      event = await Event.findByPk(eventId);
    }
    if (!event) {
      throw new Error('Se requiere el evento (eventId) o al menos un horario.');
    }

    if (participantData.allowedGuests > event.maxGuestsPerParticipant && event.maxGuestsPerParticipant > 0 && participantData.allowedGuests > 0) {
      throw new Error(`Number of allowed guests exceeds the event limit of ${event.maxGuestsPerParticipant}`);
    }

    // Reutilizar si ya existe en ESTE evento (por correo o documento).
    const orConds: any[] = [{ email: participantData.email }];
    if (participantData.documentNumber) orConds.push({ documentNumber: participantData.documentNumber });
    let participant = await Participant.findOne({ where: { eventId: event.id, [Op.or]: orConds } });

    let created = false;
    if (!participant) {
      participant = await Participant.create({ ...participantData, eventId: event.id, createdBy });
      created = true;
    }

    // La asociación tiene alias 'schedules' → mixin addSchedules.
    if (schedules.length > 0) {
      await (participant as any).addSchedules(schedules);
    }

    if (created) {
      await auditLogService.log({
        userId: createdBy,
        action: 'CREATE',
        entity: 'Participant',
        entityId: participant.id,
        details: { name: `${(participant as any).firstName} ${(participant as any).lastName}`.trim(), email: (participant as any).email },
      });
    }

    return participant;
  }

  async bulkCreateParticipants(participantsData: z.infer<typeof bulkCreateParticipantSchema>, eventId: string, createdBy: string) {
    // For bulk create, we assume we are adding them to ALL active schedules of the event, 
    // or we need to change the input to include scheduleIds.
    // Given the signature takes eventId, let's find all active schedules for this event.
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const schedules = await EventSchedule.findAll({ where: { eventId, isActive: true } });
    if (schedules.length === 0) {
        throw new Error('No active schedules found for this event to assign participants to.');
    }

    const validatedData = bulkCreateParticipantSchema.parse(participantsData);
    const results = { created: 0, errors: [] as { data: any, error: string }[] };
    
    // We process one by one to handle errors and associations
    for (const participantData of validatedData) {
        const transaction = await sequelize.transaction();
        try {
            if (participantData.allowedGuests > event.maxGuestsPerParticipant && event.maxGuestsPerParticipant > 0 && participantData.allowedGuests > 0) {
                throw new Error(`Number of allowed guests exceeds the event limit of ${event.maxGuestsPerParticipant}`);
            }

            let participant = await Participant.findOne({ where: { eventId, email: participantData.email }, transaction });

            if (!participant) {
                participant = await Participant.create({ ...participantData, eventId, createdBy }, { transaction });
                results.created++;
            }

            // Add to all active schedules of the event (alias 'schedules' → addSchedules)
            await (participant as any).addSchedules(schedules, { transaction });

            await transaction.commit();
        } catch (error: any) {
            await transaction.rollback();
            results.errors.push({ data: participantData, error: error.message });
        }
    }

    return results;
  }

  /**
   * Importación masiva con filas ya mapeadas desde Excel/CSV.
   * Si se entrega scheduleId, los participantes quedan "inscritos" a esa fecha;
   * si no, quedan "precargados" (se inscriben luego por la landing).
   * Cada fila trae: datos del participante + `guests` (invitados individuales).
   */
  async importParticipants(
    eventId: string,
    scheduleId: string | null,
    rows: any[],
    createdBy: string
  ) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error('Event not found');

    let schedule: any = null;
    if (scheduleId) {
      schedule = await EventSchedule.findOne({ where: { id: scheduleId, eventId } });
      if (!schedule) throw new Error('Schedule not found for this event');
    }

    const results = { created: 0, reused: 0, guestsCreated: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const { guests = [], ...pdata } = row;
      const tx = await sequelize.transaction();
      try {
        if (!pdata.firstName || !pdata.email) {
          throw new Error('Faltan campos obligatorios: nombre y correo');
        }

        const orConds: any[] = [{ email: pdata.email }];
        if (pdata.documentNumber) orConds.push({ documentNumber: pdata.documentNumber });
        let participant = await Participant.findOne({ where: { eventId, [Op.or]: orConds }, transaction: tx });

        if (!participant) {
          participant = await Participant.create({
            firstName: pdata.firstName,
            lastName: pdata.lastName || '',
            email: pdata.email,
            documentNumber: pdata.documentNumber || null,
            phone: pdata.phone || null,
            company: pdata.company || null,
            position: pdata.position || null,
            numeroSap: pdata.numeroSap || null,
            allowedGuests: Number(pdata.allowedGuests) || (Array.isArray(guests) ? guests.length : 0),
            eventId,
            createdBy,
            registrationSource: 'IMPORT',
          } as any, { transaction: tx });
          results.created++;
        } else {
          results.reused++;
        }

        if (schedule) {
          await ParticipantSchedule.findOrCreate({
            where: { participantId: participant.id, scheduleId: schedule.id },
            defaults: { participantId: participant.id, scheduleId: schedule.id } as any,
            transaction: tx,
          });
        }

        for (const g of (Array.isArray(guests) ? guests : [])) {
          if (!g || !g.firstName) continue;
          await Guest.create({
            participantId: participant.id,
            firstName: g.firstName,
            lastName: g.lastName || null,
            documentNumber: g.documentNumber || null,
            guestType: g.guestType || null,
            confirmed: !!schedule,
            scheduleId: schedule ? schedule.id : null,
          } as any, { transaction: tx });
          results.guestsCreated++;
        }

        await tx.commit();
      } catch (e: any) {
        await tx.rollback();
        results.errors.push({ row: i + 1, error: e.message });
      }
    }

    return results;
  }

  async updateParticipant(participantId: string, data: z.infer<typeof updateParticipantSchema>, userId?: string) {
    const validatedData = updateParticipantSchema.parse(data);
    const { scheduleIds, ...rest } = validatedData as any;
    const participant = await Participant.findByPk(participantId);
    if (!participant) {
      throw new Error('Participant not found');
    }
    // Clon profundo: get({plain:true}) queda aliased a los datos vivos y update() lo mutaría.
    const before: any = JSON.parse(JSON.stringify(participant.get({ plain: true })));
    await participant.update(rest);

    // Persistir cambios de horarios (la asociación tiene alias 'schedules').
    if (Array.isArray(scheduleIds)) {
      const schedules = await EventSchedule.findAll({ where: { id: scheduleIds } });
      await (participant as any).setSchedules(schedules);
    }

    if (userId) {
      const after: any = participant.get({ plain: true });
      const changes: Record<string, { from: any; to: any }> = {};
      for (const k of Object.keys(rest)) {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changes[k] = { from: before[k] ?? null, to: after[k] ?? null };
      }
      if (Object.keys(changes).length) {
        await auditLogService.log({
          userId,
          action: 'UPDATE',
          entity: 'Participant',
          entityId: participant.id,
          details: { name: `${after.firstName} ${after.lastName}`.trim(), changes },
        });
      }
    }

    return participant;
  }

  async deleteParticipant(participantId: string, userId?: string, reason?: string) {
    const accreditationCount = await Accreditation.count({ where: { participantId } });
    if (accreditationCount > 0) {
      throw new Error('Cannot delete participant with existing accreditations.');
    }

    const participant = await Participant.findByPk(participantId);
    if (!participant) {
        throw new Error('Participant not found');
    }

    const details = {
      name: `${(participant as any).firstName} ${(participant as any).lastName}`.trim(),
      email: (participant as any).email,
      reason: reason || null,
    };
    await participant.destroy();
    // Registro de auditoría: qué se eliminó, el motivo y quién lo hizo.
    if (userId) {
      await auditLogService.log({
        userId,
        action: 'DELETE',
        entity: 'Participant',
        entityId: participantId,
        details,
      });
    }
    return { message: 'Participant and associated guests deleted successfully' };
  }

  async getParticipant(participantId: string, includeGuests = false, includeAwards = false) {
    const include: any[] = [];
    if (includeGuests) {
      include.push({ model: Guest, as: 'guests' });
    }
    if (includeAwards) {
      // include.push({ model: Award, as: 'awards' });
    }
    // Include schedules to see what they are registered for
    include.push({ model: EventSchedule, as: 'schedules', through: { attributes: ['attended', 'attendedAt'] } });

    const participant = await Participant.findByPk(participantId, { include });
    if (!participant) {
      throw new Error('Participant not found');
    }
    return participant;
  }

  async listParticipants(eventId: string, filters: { name?: string, email?: string, accredited?: boolean, withAward?: boolean }, pagination: { page: number, limit: number }) {
    const { page = 1, limit = 10 } = pagination;
    
    // Participantes del evento (incluye precargados sin horario) vía eventId.
    const where: any = { eventId };

    const include: any[] = [
        { model: Guest, as: 'guests', attributes: [] },
        {
            model: EventSchedule,
            as: 'schedules',
            attributes: [],
            through: { attributes: [] },
            required: false // Left join: incluir precargados sin horario
        }
    ];

    if (filters.name) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${filters.name}%` } },
        { lastName: { [Op.iLike]: `%${filters.name}%` } },
        { documentNumber: { [Op.iLike]: `%${filters.name}%` } },
      ];
    }
    if (filters.email) {
      where.email = { [Op.iLike]: `%${filters.email}%` };
    }
    
    // Note: Accredited logic might need to change if accreditation is per schedule. 
    // Assuming accreditation is still global or we check if they have ANY accreditation?
    // The previous logic checked "accreditations" table. If that table has participantId, it's fine.
    if (filters.accredited !== undefined) {
        const subQuery = `(SELECT 1 FROM "accreditations" WHERE "accreditations"."participant_id" = "Participant"."id" LIMIT 1)`;
        if(filters.accredited) {
            where[Op.and] = (sequelize.literal(`EXISTS ${subQuery}`));
        } else {
            where[Op.and] = (sequelize.literal(`NOT EXISTS ${subQuery}`));
        }
    }
    if (filters.withAward !== undefined) {
        const subQuery = `(SELECT 1 FROM "participant_awards" WHERE "participant_awards"."participant_id" = "Participant"."id" LIMIT 1)`;
        if(filters.withAward) {
            where[Op.and] = (sequelize.literal(`EXISTS ${subQuery}`));
        } else {
            where[Op.and] = (sequelize.literal(`NOT EXISTS ${subQuery}`));
        }
    }

    const findOptions: any = {
      where,
      include,
      attributes: {
        include: [
            [fn('COUNT', col('guests.id')), 'guestCount'],
            [fn('BOOL_OR', col('schedules.ParticipantSchedule.attended')), 'accredited'],
            [sequelize.literal('(EXISTS (SELECT 1 FROM "participant_schedules" ps WHERE ps."participant_id" = "Participant"."id"))'), 'registered'],
        ],
      },
      group: ['Participant.id'],
      order: [['firstName', 'ASC']],
      subQuery: false,
    };

    if (limit > 0) {
      findOptions.limit = limit;
      findOptions.offset = (page - 1) * limit;
    }

    const { count, rows } = await Participant.findAndCountAll(findOptions);

    const total = Array.isArray(count) ? count.length : count;

    return { participants: rows, total, page, limit };
  }

  async searchParticipants(eventId: string, query: string) {
    if (!query || query.trim().length < 3) {
        return [];
    }
    const participants = await Participant.findAll({
      where: {
        eventId,
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } },
          { documentNumber: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [{ model: Guest, as: 'guests' }],
      limit: 10,
    });
    return participants;
  }
}

export const participantService = new ParticipantService();
