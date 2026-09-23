import { EmailTemplateService } from '../emailTemplateService';
import { EmailTemplate } from '@/models/index';

// EmailTemplate ya está mockeado por jest.setup.js.
const EmailTemplateMock = EmailTemplate as jest.Mocked<typeof EmailTemplate>;

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(() => {
    service = new EmailTemplateService();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('returns all templates ordered by name', async () => {
      const templates = [{ id: '1' }, { id: '2' }];
      (EmailTemplateMock.findAll as jest.Mock).mockResolvedValue(templates);

      const result = await service.list();

      expect(EmailTemplateMock.findAll).toHaveBeenCalledWith({ order: [['name', 'ASC']] });
      expect(result).toBe(templates);
    });
  });

  describe('getById', () => {
    it('looks the template up by primary key', async () => {
      const template = { id: 'tpl-1' };
      (EmailTemplateMock.findByPk as jest.Mock).mockResolvedValue(template);

      const result = await service.getById('tpl-1');

      expect(EmailTemplateMock.findByPk).toHaveBeenCalledWith('tpl-1');
      expect(result).toBe(template);
    });

    it('returns null when the template does not exist', async () => {
      (EmailTemplateMock.findByPk as jest.Mock).mockResolvedValue(null);
      expect(await service.getById('missing')).toBeNull();
    });
  });

  describe('create', () => {
    it('validates the input and persists it (applying the isActive default)', async () => {
      const input = { name: 'Bienvenida', templateId: 'template_abc' };
      const created = { id: 'tpl-1', ...input, isActive: true };
      (EmailTemplateMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(input);

      // El schema aplica isActive: true por defecto antes de crear.
      expect(EmailTemplateMock.create).toHaveBeenCalledWith({
        name: 'Bienvenida',
        templateId: 'template_abc',
        isActive: true,
      });
      expect(result).toBe(created);
    });

    it('keeps optional description and explicit isActive', async () => {
      const input = {
        name: 'Recordatorio',
        templateId: 'template_xyz',
        description: 'Un recordatorio',
        isActive: false,
      };
      (EmailTemplateMock.create as jest.Mock).mockResolvedValue({ id: 'tpl-2' });

      await service.create(input);

      expect(EmailTemplateMock.create).toHaveBeenCalledWith(input);
    });

    it('rejects invalid input without touching the model', async () => {
      // name demasiado corto (min 2) y templateId ausente.
      await expect(service.create({ name: 'A' })).rejects.toThrow();
      expect(EmailTemplateMock.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('validates, finds, updates and returns the template', async () => {
      const template = {
        id: 'tpl-1',
        update: jest.fn().mockResolvedValue(undefined),
      };
      (EmailTemplateMock.findByPk as jest.Mock).mockResolvedValue(template);
      const data = { name: 'Nuevo nombre' };

      const result = await service.update('tpl-1', data);

      expect(EmailTemplateMock.findByPk).toHaveBeenCalledWith('tpl-1');
      expect(template.update).toHaveBeenCalledWith({ name: 'Nuevo nombre' });
      expect(result).toBe(template);
    });

    it('throws when the template is not found', async () => {
      (EmailTemplateMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.update('missing', { name: 'Nuevo nombre' })).rejects.toThrow(
        'Plantilla no encontrada'
      );
    });

    it('rejects invalid update input before hitting the model', async () => {
      // name presente pero por debajo del mínimo (2).
      await expect(service.update('tpl-1', { name: 'A' })).rejects.toThrow();
      expect(EmailTemplateMock.findByPk).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('destroys the template and returns a confirmation message', async () => {
      const template = {
        id: 'tpl-1',
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      (EmailTemplateMock.findByPk as jest.Mock).mockResolvedValue(template);

      const result = await service.remove('tpl-1');

      expect(EmailTemplateMock.findByPk).toHaveBeenCalledWith('tpl-1');
      expect(template.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Plantilla eliminada' });
    });

    it('throws when the template is not found', async () => {
      (EmailTemplateMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow('Plantilla no encontrada');
    });
  });
});
