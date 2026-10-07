/**
 * Servicio de invitados (Guest) asociados a un participante.
 *
 * Responsable del CRUD de invitados respetando las reglas del evento: que el evento permita
 * invitados y que no se supere el máximo por participante (`allowedGuests`). Al crear un
 * invitado se le ligan las mismas fechas (EventSchedule) del participante; al borrarlo se
 * limpian esos enlaces por fecha (GuestSchedule) manualmente, ya que el soft-delete no dispara
 * el ON DELETE CASCADE. Toda operación de escritura registra auditoría.
 */
import { z } from 'zod';
import { Participant, Guest, Accreditation, Event, EventSchedule } from '@/models/index';
import { guestSchema, updateGuestSchema } from '@/utils/validators/participantSchemas';
import { auditLogService } from './auditLogService';

/** Nombre legible del invitado ("Nombre Apellido", sin espacios sobrantes) para la auditoría. */
const guestName = (g: any) => `${g.firstName} ${g.lastName || ''}`.trim();

/**
 * Lógica de negocio para agregar, editar, eliminar y listar los invitados de un participante,
 * validando permisos y cupo del evento y manteniendo coherentes los enlaces por fecha.
 */
export class GuestService {
  /**
   * Agrega un invitado a un participante (desde el ADMIN), validando solo que el evento
   * permita invitados. NO aplica tope de cantidad: el límite por participante
   * (`allowedGuests`) es exclusivo de la inscripción pública (landing). El invitado nuevo
   * se liga a TODAS las fechas en que el participante está inscrito (luego se afina por
   * fecha en el modal admin).
   *
   * @param participantId - ID del participante titular del invitado.
   * @param guestData - Datos del invitado; se validan con `guestSchema`.
   * @param userId - ID del usuario que agrega; si viene, se registra en auditoría (acción `CREATE`).
   * @returns El invitado (`Guest`) recién creado.
   * @throws {z.ZodError} Si `guestData` no cumple `guestSchema`.
   * @throws {Error} `'Participant not found'` si el participante no existe.
   * @throws {Error} `'This event does not allow guests.'` si el evento no permite invitados.
   */
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

    // Desde el ADMIN no hay tope de cantidad de invitados: el límite por participante
    // (`allowedGuests` / `maxGuestsPerParticipant`) solo aplica en la inscripción pública
    // (landing), que lo valida en su propia ruta. Aquí el organizador agrega los que necesite.

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

  /**
   * Valida y actualiza los datos de un invitado. Registra los cambios en auditoría.
   *
   * @param guestId - ID del invitado a actualizar.
   * @param data - Campos a modificar; se validan con `updateGuestSchema`.
   * @param userId - ID del usuario que edita; si viene y hubo cambios reales, se registra en auditoría (acción `UPDATE`).
   * @returns El invitado (`Guest`) actualizado.
   * @throws {z.ZodError} Si `data` no cumple `updateGuestSchema`.
   * @throws {Error} `'Guest not found'` si el invitado no existe.
   */
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

  /**
   * Elimina un invitado, siempre que no tenga acreditaciones. Antes de borrarlo limpia sus
   * enlaces por fecha (GuestSchedule), porque el soft-delete no dispara el ON DELETE CASCADE.
   *
   * @param guestId - ID del invitado a eliminar.
   * @param userId - ID del usuario que elimina; si viene, se registra en auditoría (acción `DELETE`).
   * @param reason - Motivo opcional de la eliminación (queda en el detalle de auditoría).
   * @returns Objeto `{ message: 'Guest deleted successfully' }`.
   * @throws {Error} `'Cannot delete guest with existing accreditations.'` si el invitado tiene acreditaciones.
   * @throws {Error} `'Guest not found'` si el invitado no existe.
   */
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

  /**
   * Lista los invitados de un participante.
   *
   * @param participantId - ID del participante cuyos invitados se listan.
   * @returns Arreglo de invitados (`Guest`) del participante.
   */
  async listGuestsByParticipant(participantId: string) {
    const guests = await Guest.findAll({ where: { participantId } });
    return guests;
  }
}

export const guestService = new GuestService();
