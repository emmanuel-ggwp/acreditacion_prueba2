
import { z } from 'zod';

export const accreditationSchema = z.object({
  id: z.guid(),
  participantId: z.guid().nullable(),
  guestId: z.guid().nullable(),
  eventScheduleId: z.guid(),
  accreditedBy: z.guid(),
  checkInTime: z.iso.datetime(),
  checkOutTime: z.iso.datetime().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.iso.datetime({ message: 'Formato de fecha de creación inválido' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Formato de fecha de actualización inválido' }).optional(),
}).refine(data => data.participantId || data.guestId, {
  message: "Debe proporcionarse participantId o guestId",
  path: ["participantId"],
});

export const createAccreditationSchema = accreditationSchema.omit({ id: true });

const bulkAccreditationItemSchema = z.object({
    type: z.enum(['participant', 'guest']),
    participantId: z.guid().optional(),
    guestId: z.guid().optional(),
    eventScheduleId: z.guid(),
}).refine(data => (data.type === 'participant' && data.participantId) || (data.type === 'guest' && data.guestId), {
    message: 'Debe proporcionarse un ID válido para el tipo seleccionado.',
    path: ['participantId', 'guestId'],
});

export const bulkAccreditationSchema = z.array(bulkAccreditationItemSchema);

export const verifyAccreditationSchema = z.object({
  type: z.enum(['participant', 'guest']),
  id: z.guid(),
  scheduleId: z.guid(),
});

// Cuerpo del POST /api/accreditations (acreditar una persona). Valida la FORMA: `type` y
// los ids presentes, y `notes`/`guestCount` bien tipados. No exige GUID (el servicio
// resuelve por findByPk y un id inexistente ya da "no encontrado"); `type` se deja como
// string para que el handler devuelva su propio mensaje "Invalid accreditation type".
export const accreditPersonSchema = z.object({
  type: z.string(),
  id: z.string().trim().min(1, 'Falta el id de la persona.'),
  scheduleId: z.string().trim().min(1, 'Falta la fecha (scheduleId).'),
  notes: z.string().max(2000).optional().nullable(),
  guestCount: z.number().int().min(0).optional(),
});

