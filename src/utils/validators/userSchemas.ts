import { z } from 'zod';
import { ROLES } from '../constants';

// Custom validators
const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
const documentNumberRegex = /^[a-zA-Z0-9-]{5,20}$/;

export const customValidators = {
  phone: z.string().regex(phoneRegex, 'Formato de número de teléfono inválido'),
  documentNumber: z.string().regex(documentNumberRegex, 'Formato de número de documento inválido'),
};

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.nativeEnum(ROLES),
});

export const userSchema = registerSchema.extend({
  id: z.guid(),
  isActive: z.boolean(),
  lastLogin: z.date().nullable(),
  createdAt: z.iso.datetime({ message: 'Formato de fecha de creación inválido' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Formato de fecha de actualización inválido' }).optional(),
}).omit({ password: true });

export const updateUserSchema = registerSchema.partial().extend({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
});
