
import { z } from 'zod';
import { customValidators } from './userSchemas';

export const participantSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: customValidators.phone.optional().nullable(),
  documentNumber: customValidators.documentNumber.optional().nullable(),
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  allowedGuests: z.number().int().min(0).default(0),
  createdBy: z.string().uuid(),
  isAccredited: z.boolean().default(false),
});

export const createParticipantSchema = participantSchema.omit({ id: true, createdBy: true, isAccredited: true });
export const updateParticipantSchema = createParticipantSchema.partial();

export const bulkCreateParticipantSchema = z.array(
  createParticipantSchema.omit({ eventId: true })
);

export const guestSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  documentNumber: customValidators.documentNumber.optional().nullable(),
  isAccredited: z.boolean().default(false),
});

export const createGuestSchema = guestSchema.omit({ id: true, isAccredited: true });
export const updateGuestSchema = createGuestSchema.partial();

