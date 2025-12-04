import { z } from 'zod';
import { ROLES } from '../constants';

// Custom validators
const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
const documentNumberRegex = /^[a-zA-Z0-9-]{5,20}$/;

export const customValidators = {
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  documentNumber: z.string().regex(documentNumberRegex, 'Invalid document number format'),
};

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(ROLES),
});

export const userSchema = registerSchema.extend({
  id: z.guid(),
  isActive: z.boolean(),
  lastLogin: z.date().nullable(),
  createdAt: z.iso.datetime({ message: 'Invalid createdAt date format' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Invalid updatedAt date format' }).optional(),
}).omit({ password: true });

export const updateUserSchema = registerSchema.partial().extend({
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});
