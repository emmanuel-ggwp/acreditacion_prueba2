import { z } from 'zod';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import Accreditation from '@/models/Accreditation';
import { guestSchema, updateGuestSchema } from '@/utils/validators/participantSchemas';
import Event from '@/models/Event';

export class GuestService {
  async addGuest(participantId: string, guestData: z.infer<typeof guestSchema>) {
    const validatedData = guestSchema.parse(guestData);

    const participant = await Participant.findByPk(participantId, {
        include: [{ model: Guest, as: 'guests' }, Event]
    });
    if (!participant) {
      throw new Error('Participant not found');
    }

    const event = (participant as any).Event;
    if (!event.allowGuests) {
        throw new Error('This event does not allow guests.');
    }

    const currentGuestCount = (participant as any).guests?.length || 0;
    if (currentGuestCount >= participant.allowedGuests) {
      throw new Error('Participant has reached the maximum number of guests.');
    }

    const guest = await Guest.create({ ...validatedData, participantId });
    return guest;
  }

  async updateGuest(guestId: string, data: z.infer<typeof updateGuestSchema>) {
    const validatedData = updateGuestSchema.parse(data);
    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }
    await guest.update(validatedData);
    return guest;
  }

  async deleteGuest(guestId: string) {
    const accreditationCount = await Accreditation.count({ where: { guestId } });
    if (accreditationCount > 0) {
      throw new Error('Cannot delete guest with existing accreditations.');
    }

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
        throw new Error('Guest not found');
    }

    await guest.destroy();
    return { message: 'Guest deleted successfully' };
  }

  async listGuestsByParticipant(participantId: string) {
    const guests = await Guest.findAll({ where: { participantId } });
    return guests;
  }
}

export const guestService = new GuestService();
