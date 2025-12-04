
import { z } from 'zod';
import { customValidators } from './userSchemas';

export const participantSchema = z.object({
  id: z.guid(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: customValidators.phone.optional().nullable(),
  documentNumber: customValidators.documentNumber.optional().nullable(),
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  allowedGuests: z.number().int().min(0).default(0),
  createdBy: z.guid(),
  isAccredited: z.boolean().default(false),
  createdAt: z.iso.datetime({ message: 'Invalid createdAt date format' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Invalid updatedAt date format' }).optional(),
});

export const createParticipantSchema = participantSchema.omit({ id: true, createdBy: true, isAccredited: true }).extend({
  scheduleIds: z.array(z.string().uuid()).min(1, "At least one schedule is required")
});
export const updateParticipantSchema = createParticipantSchema.partial();

export const bulkCreateParticipantSchema = z.array(
  createParticipantSchema
);

export const guestSchema = z.object({
  id: z.guid(),
  participantId: z.guid(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  documentNumber: customValidators.documentNumber.optional().nullable(),
  isAccredited: z.boolean().default(false),
});

export const createGuestSchema = guestSchema.omit({ id: true, isAccredited: true });
export const updateGuestSchema = createGuestSchema.partial();

