
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

