import { z } from 'zod';

export const emailTemplateSchema = z.object({
  id: z.guid(),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  templateId: z.string().min(3, 'El Template ID de EmailJS es obligatorio'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const createEmailTemplateSchema = emailTemplateSchema.omit({ id: true });
export const updateEmailTemplateSchema = createEmailTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
