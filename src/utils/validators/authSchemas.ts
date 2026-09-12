
import { z } from 'zod';
import { ROLES } from '@/utils/constants';

/**
 * FUENTE ÚNICA de los esquemas de autenticación (SB-31). Antes había un
 * `loginSchema` y un `registerSchema` DUPLICADOS aquí y en `userSchemas.ts`, y ya
 * habían divergido (p. ej. la política de contraseñas). Este módulo lo importan
 * tanto el servidor (login/route, authService, register/route, userService) como
 * el cliente (LoginForm, UserManager): un solo sitio donde tocar las reglas.
 */

export const loginSchema = z.object({
  // El tope de 254 es el máximo de RFC 5321 y, sobre todo, acota la clave del
  // limitador de credenciales: sin él, un email arbitrariamente largo producía
  // una clave que desbordaba `rate_limits.key varchar(255)` y el limitador
  // fallaba ABIERTO (R2-03a). La clave además se acota por su lado en
  // `auth-rate-limit.ts` — defensa en profundidad, no redundancia.
  email: z.string().max(254, { message: 'Correo electrónico demasiado largo' }).email({ message: 'Correo electrónico inválido' }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria' }),
});

/**
 * Política de contraseñas ÚNICA (D2.6 / SB-31): 8 caracteres y 4 clases. Antes
 * estaba partida —`/api/auth/register` exigía esto pero `/api/users` (userService)
 * aceptaba 6 sin complejidad—, y cualquier límite de intentos protege menos si el
 * otro camino admite contraseñas débiles. Aplica solo a altas y cambios nuevos; no
 * invalida las contraseñas existentes.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .regex(/[a-z]/, { message: 'La contraseña debe contener al menos una letra minúscula' })
  .regex(/[A-Z]/, { message: 'La contraseña debe contener al menos una letra mayúscula' })
  .regex(/[0-9]/, { message: 'La contraseña debe contener al menos un número' })
  .regex(/[^a-zA-Z0-9]/, { message: 'La contraseña debe contener al menos un carácter especial' });

/**
 * Valida una contraseña contra la política única y devuelve el PRIMER mensaje de
 * error, o null si es válida. Para el código imperativo que no usa Zod directamente
 * (userService).
 */
export function passwordError(password: unknown): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0].message;
}

const roleValues = Object.values(ROLES) as [string, ...string[]];

export const registerSchema = z.object({
  username: z.string().min(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' }),
  email: z.string().email({ message: 'Correo electrónico inválido' }),
  password: passwordSchema,
  firstName: z.string().min(1, { message: 'El nombre es obligatorio' }),
  lastName: z.string().min(1, { message: 'El apellido es obligatorio' }),
  role: z.enum(roleValues),
});
