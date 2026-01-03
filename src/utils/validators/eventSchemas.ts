
import { z } from 'zod';

export const eventSchema = z.object({
  id: z.guid(),
  name: z.string().min(3, 'Event name must be at least 3 characters'),
  description: z.string().optional(),
  location: z.string().optional(),
  maxCapacity: z.number().int().positive(),
  allowGuests: z.boolean().default(true),
  maxGuestsPerParticipant: z.number().int().min(0).default(0),
  publicSlug: z.string().optional().nullable(),
  publicTemplate: z.string().optional().nullable(),
  isPublic: z.boolean().default(false),
  registrationConfig: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().default(true),
  createdBy: z.guid(),
  createdAt: z.iso.datetime({ message: 'Invalid createdAt date format' }).optional(),
  updatedAt: z.iso.datetime({ message: 'Invalid updatedAt date format' }).optional(),
});

export const createEventSchema = eventSchema.omit({ id: true, isActive: true, createdBy: true });
export const updateEventSchema = createEventSchema.partial();

export const scheduleSchema = z.object({
  id: z.guid(),
  eventId: z.guid(),
  scheduleName: z.string().min(3, 'Schedule name must be at least 3 characters'),
  startDateTime: z.iso.datetime({ message: 'Invalid start date format' }),
  endDateTime: z.iso.datetime({ message: 'Invalid end date format' }),
  maxCapacity: z.number().int().positive('Max capacity must be greater than 0').optional().or(z.literal(0)),
  location: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine(data => new Date(data.endDateTime) > new Date(data.startDateTime), {
  message: 'End date must be after start date',
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

