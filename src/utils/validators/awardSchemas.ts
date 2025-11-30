
import { z } from 'zod';

export const awardSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().min(3, 'Award name must be at least 3 characters'),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(0),
});

export const createAwardSchema = awardSchema.omit({ id: true });
export const updateAwardSchema = createAwardSchema.partial();

export const participantAwardSchema = z.object({
    id: z.string().uuid(),
    participantId: z.string().uuid(),
    awardId: z.string().uuid(),
    assignedBy: z.string().uuid(),
    deliveredAt: z.string().datetime().nullable(),
});

export const assignAwardSchema = participantAwardSchema.omit({ id: true, deliveredAt: true });

