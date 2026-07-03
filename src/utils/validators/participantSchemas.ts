
import { z } from 'zod';
import { customValidators } from './userSchemas';

export const participantSchema = z.object({
  id: z.guid(),
  eventId: z.guid().optional(),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: customValidators.phone.optional().nullable(),
  documentNumber: customValidators.documentNumber.optional().nullable(),
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  numeroSap: z.string().optional().nullable(),
  birthDate: z.iso.date({ message: 'Fecha de nacimiento inválida' }).optional().nullable(),
  age: z.number().int().min(0).optional().nullable(),
  dietaryPreference: z.string().optional(),
  dietaryComments: z.string().optional().nullable(),
  allowedGuests: z.number().int().min(0).default(0),
  customData: z.any().optional().nullable(),
  isAwarded: z.boolean().optional(),
  awardReason: z.string().optional().nullable(),
  allowMultipleSchedules: z.boolean().optional(),
  createdBy: z.guid(),
  isAccredited: z.boolean().default(false),
  createdAt: z.iso.datetime({ message: 'Formato de fecha de creación inválido' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Formato de fecha de actualización inválido' }).optional(),
});

export const createParticipantSchema = participantSchema.omit({ id: true, createdBy: true, isAccredited: true }).extend({
  // Opcional: sin horario = participante "precargado" (se inscribe luego). Con horario = inscrito.
  scheduleIds: z.array(z.string().uuid()).optional().default([])
});
// En update no se reaplican los .default() (evita machacar allowedGuests/scheduleIds en una edición parcial).
export const updateParticipantSchema = createParticipantSchema.partial().extend({
  allowedGuests: z.number().int().min(0).optional(),
  scheduleIds: z.array(z.string().uuid()).optional(),
});

export const bulkCreateParticipantSchema = z.array(
  createParticipantSchema
);

export const guestSchema = z.object({
  id: z.guid(),
  participantId: z.guid(),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional().nullable(),
  documentNumber: customValidators.documentNumber.optional().nullable(),
  email: z.string().email('Correo electrónico inválido').optional().nullable(),
  phone: customValidators.phone.optional().nullable(),
  birthDate: z.iso.date({ message: 'Fecha de nacimiento inválida' }).optional().nullable(),
  age: z.number().int().min(0).optional().nullable(),
  guestType: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  dietaryPreference: z.string().optional().nullable(),
  customData: z.any().optional().nullable(),
  isAccredited: z.boolean().default(false),
});

export const createGuestSchema = guestSchema.omit({ id: true, isAccredited: true });
export const updateGuestSchema = createGuestSchema.partial();

export const publicRegistrationSchema = participantSchema.omit({
  id: true,
  createdBy: true,
  isAccredited: true,
  allowedGuests: true,
  createdAt: true,
  updatedAt: true
}).extend({
  scheduleIds: z.array(z.string().uuid()).min(1, "Se requiere al menos un horario"),
  // En el registro público no exigimos formato estricto: se aceptan tal cual.
  // El RUT (documentNumber) es OBLIGATORIO: identifica a la persona y evita duplicados.
  phone: z.string().optional().nullable(),
  documentNumber: z.string().trim().min(1, 'El RUT es obligatorio'),
  numeroSap: z.string().optional().nullable(),
  // Invitados que el asistente agrega desde el landing (hasta el máximo del evento).
  guests: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().nullable(),
    documentNumber: z.string().optional().nullable(),
    guestType: z.string().optional().nullable(),
    dietaryPreference: z.string().optional().nullable(),
  })).optional(),
});

