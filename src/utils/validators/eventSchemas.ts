
import { z } from 'zod';

// ---- Configuración de la landing pública (Event.registrationConfig) ----

/** Tipos de campo soportados en formularios dinámicos. */
export const fieldTypeEnum = z.enum([
  'text', 'number', 'date', 'email', 'phone', 'rut', 'select', 'checkbox', 'textarea',
]);

/** Definición de un campo configurable del formulario. */
export const formFieldConfigSchema = z.object({
  key: z.string(),                 // nombre interno
  label: z.string(),               // etiqueta visible
  type: fieldTypeEnum,
  required: z.boolean().default(false),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(), // para select
});

/** Opción de tipo de invitado (ej. { value: 'CARGA', label: 'Carga' }). */
export const guestTypeOptionSchema = z.object({ value: z.string(), label: z.string() });

/** Configuración de invitados por evento. */
export const guestsConfigSchema = z.object({
  allowed: z.boolean().default(false),
  max: z.number().int().min(0).default(0),
  typesEnabled: z.boolean().default(false),
  types: z.array(guestTypeOptionSchema).default([]),
  fields: z.array(formFieldConfigSchema).default([]),
  // ¿Se pide preferencia alimenticia a cada invitado?
  dietary: z.boolean().optional(),
});

/** Config de un campo opcional del formulario: { enabled, required }. */
export const fieldToggleSchema = z.object({
  enabled: z.boolean().optional(),
  required: z.boolean().optional(),
});

/** Configuración de colores / tema visual de la landing. */
export const themeConfigSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  buttonColor: z.string().optional(),
  textColor: z.string().optional(),
  inputColor: z.string().optional(),
  borderColor: z.string().optional(),
  formBackgroundColor: z.string().optional(),
  overlayColor: z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
  titleFont: z.string().optional(),
});

/** Imágenes de la landing (también disponibles como columnas en Event). */
export const imagesConfigSchema = z.object({
  logoUrl: z.string().optional().nullable(),
  backgroundImageUrl: z.string().optional().nullable(),
});

/** Forma canónica de Event.registrationConfig. */
export const registrationConfigSchema = z.object({
  mode: z.enum(['open', 'rut']).optional(),
  theme: themeConfigSchema.optional(),
  images: imagesConfigSchema.optional(),
  fields: z.array(formFieldConfigSchema).optional(),
  // Config de campos predefinidos: { phone: {enabled,required}, numeroSap: {...}, dietary: {...}, ... }
  formFields: z.record(z.string(), fieldToggleSchema).optional(),
  // Opciones de preferencia alimenticia personalizadas por evento (etiquetas).
  dietaryOptions: z.array(z.string()).optional(),
  guests: guestsConfigSchema.optional(),
});

export type FieldType = z.infer<typeof fieldTypeEnum>;
export type FormFieldConfig = z.infer<typeof formFieldConfigSchema>;
export type GuestsConfig = z.infer<typeof guestsConfigSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type RegistrationConfig = z.infer<typeof registrationConfigSchema>;

export const eventSchema = z.object({
  id: z.guid(),
  name: z.string().min(3, 'El nombre del evento debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  location: z.string().optional(),
  maxCapacity: z.number().int().positive(),
  allowGuests: z.boolean().default(true),
  maxGuestsPerParticipant: z.number().int().min(0).default(0),
  publicSlug: z.string().optional().nullable(),
  publicTemplate: z.string().optional().nullable(),
  isPublic: z.boolean().default(false),
  registrationOpen: z.boolean().default(true),
  allowMultipleSchedules: z.boolean().default(false),
  registrationConfig: registrationConfigSchema.optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  backgroundImageUrl: z.string().optional().nullable(),
  emailTemplateId: z.guid().optional().nullable(),
  isActive: z.boolean().default(true),
  createdBy: z.guid(),
  createdAt: z.iso.datetime({ message: 'Formato de fecha de creación inválido' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Formato de fecha de actualización inválido' }).optional(),
});

export const createEventSchema = eventSchema.omit({ id: true, isActive: true, createdBy: true });

// En update NO deben aplicarse los .default(): una edición parcial (ej. solo
// registrationOpen) no debe reescribir isPublic/allowGuests a su valor por
// defecto. Por eso re-declaramos esos campos como opcionales sin default.
export const updateEventSchema = createEventSchema.partial().extend({
  allowGuests: z.boolean().optional(),
  maxGuestsPerParticipant: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  allowMultipleSchedules: z.boolean().optional(),
});

export const scheduleSchema = z.object({
  id: z.guid(),
  eventId: z.guid(),
  scheduleName: z.string().min(3, 'El nombre del horario debe tener al menos 3 caracteres'),
  startDateTime: z.iso.datetime({ message: 'Formato de fecha de inicio inválido' }),
  endDateTime: z.iso.datetime({ message: 'Formato de fecha de término inválido' }),
  maxCapacity: z.number().int().positive('La capacidad máxima debe ser mayor que 0').optional().or(z.literal(0)),
  location: z.string().optional(),
  blockType: z.enum(['SINGLE', 'AM', 'PM', 'FULL_DAY', 'CUSTOM']).default('SINGLE'),
  label: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
}).refine(data => new Date(data.endDateTime) > new Date(data.startDateTime), {
  message: 'La fecha de término debe ser posterior a la fecha de inicio',
  path: ['endDateTime'],
});

export const createScheduleSchema = scheduleSchema.omit({ id: true, isActive: true });
export const updateScheduleSchema = createScheduleSchema.partial();

export const eventFilterSchema = z.object({
  isActive: z.string().transform(val => val === 'true').optional(),
  createdBy: z.guid().optional(),
  includeSchedules: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => parseInt(val, 10)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'startDateTime']).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
  filter: z.enum(['all', 'accredited', 'accrediting', 'upcoming', 'cancelled']).optional(),
});

