
import { z } from 'zod';

export const awardSchema = z.object({
  id: z.guid(),
  eventId: z.guid(),
  name: z.string().min(3, 'Award name must be at least 3 characters'),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(0),
});

export const createAwardSchema = awardSchema.omit({ id: true });
export const updateAwardSchema = createAwardSchema.partial();

export const participantAwardSchema = z.object({
    id: z.guid(),
    participantId: z.guid(),
    awardId: z.guid(),
    assignedBy: z.guid(),
    deliveredAt: z.iso.datetime().nullable(),
});

export const assignAwardSchema = participantAwardSchema.omit({ id: true, deliveredAt: true });

