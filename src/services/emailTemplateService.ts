import { EmailTemplate } from '@/models/index';
import { createEmailTemplateSchema, updateEmailTemplateSchema } from '@/utils/validators/emailTemplateSchemas';

export class EmailTemplateService {
  async list() {
    return EmailTemplate.findAll({ order: [['name', 'ASC']] });
  }

  async getById(id: string) {
    return EmailTemplate.findByPk(id);
  }

  async create(data: unknown) {
    const validated = createEmailTemplateSchema.parse(data);
    return EmailTemplate.create(validated as any);
  }

  async update(id: string, data: unknown) {
    const validated = updateEmailTemplateSchema.parse(data);
    const template = await EmailTemplate.findByPk(id);
    if (!template) throw new Error('Plantilla no encontrada');
    await template.update(validated as any);
    return template;
  }

  async remove(id: string) {
    const template = await EmailTemplate.findByPk(id);
    if (!template) throw new Error('Plantilla no encontrada');
    await template.destroy();
    return { message: 'Plantilla eliminada' };
  }
}

export const emailTemplateService = new EmailTemplateService();
