
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
  // Invitados en modos numéricos (registrationConfig.guests.mode).
  guestCount: z.number().int().min(0).optional(),
  guestCompanion: z.boolean().optional(),
  guestLoads: z.number().int().min(0).optional(),
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

/**
 * Tope duro del número de invitados que puede traer UNA petición. No es el límite
 * de negocio —ese sale de `allowedGuests` y del máximo del evento, y se comprueba
 * en el handler—, sino el freno que evita que un array de 100.000 elementos llegue
 * siquiera a recorrerse (F4-02).
 */
export const MAX_GUESTS_PER_REQUEST = 20;

/**
 * Tope de los campos de texto libre que van a una columna `VARCHAR(255)`.
 *
 * R1-03 / D1.5: **cada `.max()` sale de la columna que respalda el campo**, no de un
 * número elegido a ojo. Las tres columnas implicadas —`guests.dietary_preference`,
 * `participants.dietary_preference` y `participants.dietary_comments`— son
 * `VARCHAR(255)`, comprobado contra la base, no contra el modelo.
 *
 * Un tope MENOR que la columna rechaza datos legítimos con 400; uno MAYOR deja que la
 * fila llegue a PostgreSQL y reviente con 500. Los dos errores estaban presentes a la
 * vez, en campos contiguos del mismo esquema.
 */
export const TEXT_COLUMN_MAX = 255;

export const publicGuestSchema = z.object({
  // Las cargas precargadas se seleccionan por id; los acompañantes nuevos no lo traen.
  id: z.string().uuid().optional(),
  firstName: z.string().trim().max(120).optional().nullable(),
  lastName: z.string().trim().max(120).optional().nullable(),
  documentNumber: z.string().trim().max(40).optional().nullable(),
  // Etiqueta configurable por evento: la elige el administrador, así que su longitud
  // no es predecible. El límite es la columna.
  guestType: z.string().trim().max(TEXT_COLUMN_MAX).optional().nullable(),
  // NO es el código de dieta: el cliente manda el texto compuesto por `dietary.ts:74-80`
  // —`"<etiqueta>: <texto libre>"`— porque el invitado no tiene columna de comentarios.
  // Con el tope en 60, «Alergia: » (9 caracteres) dejaba 51 para el detalle y cualquier
  // alergia algo descrita reventaba la petición ENTERA con «Validation error».
  dietaryPreference: z.string().trim().max(TEXT_COLUMN_MAX).optional().nullable(),
});

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
  // `participantSchema` no acota estos dos, así que en modo ABIERTO un comentario de
  // 300 caracteres llegaba entero a una columna `VARCHAR(255)` y devolvía 500. Es el
  // mismo defecto que el modo `rut` tenía al revés (tope por encima de la columna), y
  // se corrige aquí para que las dos ramas del registro público respondan igual.
  // Los topes que faltan en los caminos de ADMINISTRACIÓN son F4-03 → plan 04.
  dietaryPreference: z.string().trim().max(TEXT_COLUMN_MAX).optional(),
  dietaryComments: z.string().trim().max(TEXT_COLUMN_MAX).optional().nullable(),
  // Invitados que el asistente agrega desde el landing (hasta el máximo del evento).
  // El `.max()` es un tope duro de esquema: corta el array antes de tocar la base de
  // datos. El límite real por participante (allowedGuests, máximo del evento) se
  // comprueba en el handler, que es donde se conocen. Ver F4-02.
  guests: z.array(publicGuestSchema).max(MAX_GUESTS_PER_REQUEST).optional(),
});

export type PublicGuestInput = z.infer<typeof publicGuestSchema>;

/**
 * Registro público en modo `rut`: el participante ya existe precargado y se
 * identifica con el `participantId` que devolvió el `lookup`.
 *
 * Esquema propio y NO derivado de `publicRegistrationSchema` por dos motivos
 * verificados en el código (F4-01):
 *
 * 1. `publicRegistrationSchema` exige `documentNumber`, y el payload de modo `rut`
 *    de `GalaTemplate.tsx:170-178` no lo envía. Reutilizarlo rompería esa plantilla.
 * 2. `publicRegistrationSchema` deriva de `participantSchema.omit(...)` y sigue
 *    admitiendo `eventId`, `isAwarded`, `awardReason`, `allowMultipleSchedules`,
 *    `customData`... Usar su salida para un `update` sería PEOR que el código que
 *    sustituye: abriría campos que hoy no son alcanzables.
 *
 * Aquí solo entran los campos que el formulario público rellena de verdad.
 * `documentNumber` queda deliberadamente FUERA: es la identidad del precargado y el
 * formulario lo muestra como solo lectura; aceptarlo permitiría reescribir el RUT
 * de otra persona.
 */
export const RUT_UPDATABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'position',
  'numeroSap',
  'dietaryPreference',
  'dietaryComments',
  'guestCount',
  'guestCompanion',
  'guestLoads',
] as const;

export const rutRegistrationSchema = z.object({
  participantId: z.string().uuid('Identificador de participante inválido'),
  scheduleIds: z.array(z.string().uuid()).min(1, 'Se requiere al menos un horario'),

  firstName: z.string().trim().max(120).optional().nullable(),
  lastName: z.string().trim().max(120).optional().nullable(),
  email: z.string().email('Correo electrónico inválido').max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(150).optional().nullable(),
  position: z.string().trim().max(150).optional().nullable(),
  numeroSap: z.string().trim().max(60).optional().nullable(),
  // Los dos van a `VARCHAR(255)`, y los dos estaban mal en sentidos OPUESTOS:
  //
  //   `dietaryPreference` con tope 60 · el valor que el cliente reenvía es el que trajo
  //   el lookup, y las opciones de dieta personalizadas por evento son su propia
  //   etiqueta. Un precargado cuya preferencia guardada pasara de 60 caracteres quedaba
  //   BLOQUEADO de forma permanente: no podía inscribirse ni corrigiendo nada, porque
  //   el dato que lo rechazaba era el suyo ya almacenado.
  //
  //   `dietaryComments` con tope 1000 · cuatro veces la columna. 300 caracteres pasaban
  //   la validación y morían en PostgreSQL: 500, no 400.
  dietaryPreference: z.string().trim().max(TEXT_COLUMN_MAX).optional().nullable(),
  dietaryComments: z.string().trim().max(TEXT_COLUMN_MAX).optional().nullable(),

  guestCount: z.number().int().min(0).max(50).optional().nullable(),
  guestCompanion: z.boolean().optional().nullable(),
  guestLoads: z.number().int().min(0).max(50).optional().nullable(),

  guests: z.array(publicGuestSchema).max(MAX_GUESTS_PER_REQUEST).optional(),
});

