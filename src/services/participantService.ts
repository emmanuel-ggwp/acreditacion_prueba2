
import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import Award from '@/models/Award';
import Event from '@/models/Event';
import Accreditation from '@/models/Accreditation';
import { participantSchema, updateParticipantSchema, bulkCreateParticipantSchema } from '@/utils/validators/participantSchemas';

export class ParticipantService {
  async createParticipant(data: z.infer<typeof participantSchema>, createdBy: string) {
    const validatedData = participantSchema.parse(data);

    const event = await Event.findByPk(validatedData.eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (validatedData.allowedGuests > event.maxGuestsPerParticipant) {
      throw new Error(`Number of allowed guests exceeds the event limit of ${event.maxGuestsPerParticipant}`);
    }

    const existingParticipant = await Participant.findOne({ where: { email: validatedData.email, eventId: validatedData.eventId } });
    if (existingParticipant) {
        throw new Error('A participant with this email already exists for this event.');
    }

    const participant = await Participant.create({ ...validatedData, createdBy });
    return participant;
  }

  async bulkCreateParticipants(participantsData: z.infer<typeof bulkCreateParticipantSchema>, eventId: string, createdBy: string) {
    const validatedData = bulkCreateParticipantSchema.parse(participantsData);
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const results = { created: 0, errors: [] as { data: any, error: string }[] };
    const transaction = await sequelize.transaction();

    try {
        for (const participantData of validatedData) {
            try {
                if (participantData.allowedGuests > event.maxGuestsPerParticipant) {
                    throw new Error(`Number of allowed guests exceeds the event limit of ${event.maxGuestsPerParticipant}`);
                }

                const existingParticipant = await Participant.findOne({ where: { email: participantData.email, eventId }, transaction });
                if (existingParticipant) {
                    throw new Error('A participant with this email already exists for this event.');
                }

                await Participant.create({ ...participantData, eventId, createdBy }, { transaction });
                results.created++;
            } catch (error: any) {
                results.errors.push({ data: participantData, error: error.message });
            }
        }

        await transaction.commit();
        return results;
    } catch (error: any) {
        await transaction.rollback();
        throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async updateParticipant(participantId: string, data: z.infer<typeof updateParticipantSchema>) {
    const validatedData = updateParticipantSchema.parse(data);
    const participant = await Participant.findByPk(participantId);
    if (!participant) {
      throw new Error('Participant not found');
    }
    await participant.update(validatedData);
    return participant;
  }

  async deleteParticipant(participantId: string) {
    const accreditationCount = await Accreditation.count({ where: { participantId } });
    if (accreditationCount > 0) {
      throw new Error('Cannot delete participant with existing accreditations.');
    }

    const participant = await Participant.findByPk(participantId);
    if (!participant) {
        throw new Error('Participant not found');
    }

    // This will also delete associated guests due to onDelete: 'CASCADE' if configured in the model association
    await participant.destroy();
    return { message: 'Participant and associated guests deleted successfully' };
  }

  async getParticipant(participantId: string, includeGuests = false, includeAwards = false) {
    const include = [];
    if (includeGuests) {
      include.push({ model: Guest, as: 'guests' });
    }
    if (includeAwards) {
      include.push({ model: Award, as: 'awards' });
    }

    const participant = await Participant.findByPk(participantId, { include });
    if (!participant) {
      throw new Error('Participant not found');
    }
    return participant;
  }

  async listParticipants(eventId: string, filters: { name?: string, email?: string, accredited?: boolean, withAward?: boolean }, pagination: { page: number, limit: number }) {
    const { page = 1, limit = 10 } = pagination;
    const where: any = { eventId };
    const include: any[] = [
        { model: Guest, attributes: [] }
    ];

    if (filters.name) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${filters.name}%` } },
        { lastName: { [Op.iLike]: `%${filters.name}%` } },
      ];
    }
    if (filters.email) {
      where.email = { [Op.iLike]: `%${filters.email}%` };
    }
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
        include: [[fn('COUNT', col('Guests.id')), 'guestCount']],
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
      limit: 10,
    });
    return participants;
  }
}

export const participantService = new ParticipantService();
