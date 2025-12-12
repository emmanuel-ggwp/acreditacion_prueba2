
import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import { 
  Participant, 
  Guest, 
  Award, 
  Event, 
  EventSchedule, 
  Accreditation 
} from '@/models/index';
import { createParticipantSchema, updateParticipantSchema, bulkCreateParticipantSchema } from '@/utils/validators/participantSchemas';

export class ParticipantService {
  async createParticipant(data: z.infer<typeof createParticipantSchema>, createdBy: string) {
    const validatedData = createParticipantSchema.parse(data);
    const { scheduleIds, ...participantData } = validatedData;

    // Verify schedules exist and get their event
    const schedules = await EventSchedule.findAll({
      where: { id: scheduleIds },
      include: [{ model: Event }]
    });

    if (schedules.length !== scheduleIds.length) {
      throw new Error('One or more schedules not found');
    }

    // Check guest limits against the event of the first schedule (assuming all schedules belong to same event or we pick one)
    // Ideally we should check consistency, but for now let's check the first one.
    const event = schedules[0].Event; // Access included Event
    if (event && participantData.allowedGuests > event.maxGuestsPerParticipant && event.maxGuestsPerParticipant > 0 && participantData.allowedGuests > 0) {
       throw new Error(`Number of allowed guests exceeds the event limit of ${event.maxGuestsPerParticipant}`);
    }

    // Check if participant exists by email or documentNumber
    let participant = await Participant.findOne({
      where: {
        [Op.or]: [
          { email: participantData.email },
          { documentNumber: participantData.documentNumber }
        ]
      }
    });

    if (!participant) {
      participant = await Participant.create({ ...participantData, createdBy });
    } else {
      // Optional: Update existing participant data? For now, let's just use the existing one.
      // Or maybe throw error if we want strict uniqueness?
      // The user said "participants ots going to have multiple schedulesId", implying reuse.
      // Let's update the allowedGuests if the new one is higher? Or just keep existing?
      // Let's keep existing for now to be safe, or update if provided.
    }

    // Add schedules
    await participant.addEventSchedules(schedules);

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

            let participant = await Participant.findOne({ where: { email: participantData.email }, transaction });
            
            if (!participant) {
                participant = await Participant.create({ ...participantData, createdBy }, { transaction });
                results.created++;
            }

            // Add to all active schedules of the event
            await participant.addEventSchedules(schedules, { transaction });

            await transaction.commit();
        } catch (error: any) {
            await transaction.rollback();
            results.errors.push({ data: participantData, error: error.message });
        }
    }

    return results;
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

    await participant.destroy();
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
    
    // Filter participants who have at least one schedule belonging to the given eventId
    const where: any = {};
    
    const include: any[] = [
        { model: Guest, as: 'guests', attributes: [] },
        { 
            model: EventSchedule, 
            as: 'schedules',
            where: { eventId }, // This filters the participants to those linked to schedules of this event
            attributes: [],
            through: { attributes: [] },
            required: true // Inner join
        }
    ];

    if (filters.name) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${filters.name}%` } },
        { lastName: { [Op.like]: `%${filters.name}%` } },
      ];
    }
    if (filters.email) {
      where.email = { [Op.like]: `%${filters.email}%` };
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
            [fn('MAX', col('schedules.ParticipantSchedule.attended')), 'accredited']
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
        [Op.or]: [
          { firstName: { [Op.like]: `%${query}%` } },
          { lastName: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { documentNumber: { [Op.like]: `%${query}%` } },
        ],
      },
      include: [{
          model: EventSchedule,
          as: 'schedules',
          where: { eventId },
          attributes: [],
          through: { attributes: [] },
          required: true
      }],
      limit: 10,
    });
    return participants;
  }
}

export const participantService = new ParticipantService();
