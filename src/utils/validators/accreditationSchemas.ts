
import { z } from 'zod';

export const accreditationSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid().nullable(),
  guestId: z.string().uuid().nullable(),
  eventScheduleId: z.string().uuid(),
  accreditedBy: z.string().uuid(),
  checkInTime: z.string().datetime(),
  checkOutTime: z.string().datetime().nullable(),
  notes: z.string().optional().nullable(),
}).refine(data => data.participantId || data.guestId, {
  message: "Either participantId or guestId must be provided",
  path: ["participantId"],
});

export const createAccreditationSchema = accreditationSchema.omit({ id: true });

const bulkAccreditationItemSchema = z.object({
    type: z.enum(['participant', 'guest']),
    participantId: z.string().uuid().optional(),
    guestId: z.string().uuid().optional(),
    eventScheduleId: z.string().uuid(),
}).refine(data => (data.type === 'participant' && data.participantId) || (data.type === 'guest' && data.guestId), {
    message: 'A valid ID for the selected type must be provided.',
    path: ['participantId', 'guestId'],
});

export const bulkAccreditationSchema = z.array(bulkAccreditationItemSchema);

export const verifyAccreditationSchema = z.object({
  type: z.enum(['participant', 'guest']),
  id: z.string().uuid(),
  scheduleId: z.string().uuid(),
});

