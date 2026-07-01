
import { z } from 'zod';
import { ROLES } from '@/utils/constants';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria' }),
});

const roleValues = Object.values(ROLES) as [string, ...string[]];

export const registerSchema = z.object({
  username: z.string().min(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' }),
  email: z.string().email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula' })
    .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
    .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
    .regex(/[^a-zA-Z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' }),
  firstName: z.string().min(1, { message: 'El nombre es obligatorio' }),
  lastName: z.string().min(1, { message: 'El apellido es obligatorio' }),
  role: z.enum(roleValues),
});
