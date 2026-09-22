import { z } from 'zod';
import { Participant, Guest, Accreditation, Event, EventSchedule } from '@/models/index';
import { guestSchema, updateGuestSchema } from '@/utils/validators/participantSchemas';
import { auditLogService } from './auditLogService';

const guestName = (g: any) => `${g.firstName} ${g.lastName || ''}`.trim();

export class GuestService {
  async addGuest(participantId: string, guestData: z.infer<typeof guestSchema>, userId?: string) {
    const validatedData = guestSchema.parse(guestData);

    const participant = await Participant.findByPk(participantId, {
        include: [
          { model: Guest, as: 'guests' },
          { model: Event, as: 'event' },
          // Fechas en que el participante está inscrito: el invitado nuevo se liga a todas
          // (luego se afina por fecha en el modal admin). Mantiene el modelo coherente:
          // sin esto, un invitado agregado por admin quedaba sin fechas (solo el fallback
          // lo mostraba en el check-in).
          { model: EventSchedule, as: 'schedules', through: { attributes: [] } },
        ]
    });
    if (!participant) {
      throw new Error('Participant not found');
    }

    const event = (participant as any).event;
    if (event && !event.allowGuests) {
        throw new Error('This event does not allow guests.');
    }

    const currentGuestCount = (participant as any).guests?.length || 0;
    if (currentGuestCount >= participant.allowedGuests) {
      throw new Error('Participant has reached the maximum number of guests.');
    }

    const guest = await Guest.create({ ...validatedData, participantId });
    const scheds = (participant as any).schedules || [];
    if (scheds.length) {
      await (guest as any).addSchedules(scheds);
    }
    if (userId) {
      await auditLogService.log({ userId, action: 'CREATE', entity: 'Guest', entityId: guest.id, details: { name: guestName(guest) } });
    }
    return guest;
  }

  async updateGuest(guestId: string, data: z.infer<typeof updateGuestSchema>, userId?: string) {
    const validatedData = updateGuestSchema.parse(data);
    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }
    const before: any = JSON.parse(JSON.stringify(guest.get({ plain: true })));
    await guest.update(validatedData);
    if (userId) {
      const changes = auditLogService.buildChanges(before, guest.get({ plain: true }), Object.keys(validatedData));
      if (Object.keys(changes).length) {
        await auditLogService.log({ userId, action: 'UPDATE', entity: 'Guest', entityId: guest.id, details: { name: guestName(guest), changes } });
      }
    }
    return guest;
  }

  async deleteGuest(guestId: string, userId?: string, reason?: string) {
    const accreditationCount = await Accreditation.count({ where: { guestId } });
    if (accreditationCount > 0) {
      throw new Error('Cannot delete guest with existing accreditations.');
    }

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
        throw new Error('Guest not found');
    }

    const name = guestName(guest);
    // Limpia los enlaces por fecha (GuestSchedule) antes de borrar: el soft-delete del
    // invitado no dispara el ON DELETE CASCADE, así que sin esto quedaban filas colgando.
    await (guest as any).setSchedules([]);
    await guest.destroy();
    if (userId) {
      await auditLogService.log({ userId, action: 'DELETE', entity: 'Guest', entityId: guestId, details: { name, reason: reason || null } });
    }
    return { message: 'Guest deleted successfully' };
  }

  async listGuestsByParticipant(participantId: string) {
    const guests = await Guest.findAll({ where: { participantId } });
    return guests;
  }
}

export const guestService = new GuestService();
