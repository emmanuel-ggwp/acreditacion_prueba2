
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
  createdAt: z.iso.datetime({ message: 'Invalid createdAt date format' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Invalid updatedAt date format' }).optional(),
}).refine(data => data.participantId || data.guestId, {
  message: "Either participantId or guestId must be provided",
  path: ["participantId"],
});

export const createAccreditationSchema = accreditationSchema.omit({ id: true });

const bulkAccreditationItemSchema = z.object({
    type: z.enum(['participant', 'guest']),
    participantId: z.guid().optional(),
    guestId: z.guid().optional(),
    eventScheduleId: z.guid(),
}).refine(data => (data.type === 'participant' && data.participantId) || (data.type === 'guest' && data.guestId), {
    message: 'A valid ID for the selected type must be provided.',
    path: ['participantId', 'guestId'],
});

export const bulkAccreditationSchema = z.array(bulkAccreditationItemSchema);

export const verifyAccreditationSchema = z.object({
  type: z.enum(['participant', 'guest']),
  id: z.guid(),
  scheduleId: z.guid(),
});

