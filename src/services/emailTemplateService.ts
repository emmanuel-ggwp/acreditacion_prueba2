/**
 * Servicio de plantillas de correo (EmailTemplate).
 *
 * Gestiona el CRUD de las plantillas usadas para los correos del sistema
 * (por ejemplo, confirmaciones de inscripción). Las operaciones de escritura
 * validan la entrada con esquemas Zod antes de tocar la base de datos.
 */
import { EmailTemplate } from '@/models/index';
import { createEmailTemplateSchema, updateEmailTemplateSchema } from '@/utils/validators/emailTemplateSchemas';

/**
 * Encapsula el acceso a datos y las reglas de negocio de las plantillas de correo.
 */
export class EmailTemplateService {
  /**
   * Lista todas las plantillas de correo ordenadas alfabéticamente por nombre.
   *
   * @returns Promesa que resuelve al arreglo de plantillas (`EmailTemplate[]`) ordenado por `name` ascendente.
   */
  async list() {
    return EmailTemplate.findAll({ order: [['name', 'ASC']] });
  }

  /**
   * Obtiene una plantilla por su identificador.
   *
   * @param id - Identificador (PK) de la plantilla a buscar.
   * @returns Promesa que resuelve a la instancia `EmailTemplate`, o `null` si no existe.
   */
  async getById(id: string) {
    return EmailTemplate.findByPk(id);
  }

  /**
   * Crea una nueva plantilla de correo.
   *
   * Valida los datos con `createEmailTemplateSchema` (Zod) antes de persistir.
   *
   * @param data - Datos de la plantilla sin validar (tipo `unknown`); se validan con el esquema Zod.
   * @returns Promesa que resuelve a la plantilla creada (`EmailTemplate`).
   * @throws {ZodError} Si `data` no cumple `createEmailTemplateSchema` (lanzado por `.parse`).
   */
  async create(data: unknown) {
    const validated = createEmailTemplateSchema.parse(data);
    return EmailTemplate.create(validated as any);
  }

  /**
   * Actualiza una plantilla existente.
   *
   * Valida los datos con `updateEmailTemplateSchema` (Zod) antes de aplicar los cambios.
   *
   * @param id - Identificador (PK) de la plantilla a actualizar.
   * @param data - Datos parciales sin validar (tipo `unknown`); se validan con el esquema Zod.
   * @returns Promesa que resuelve a la plantilla actualizada (`EmailTemplate`).
   * @throws {ZodError} Si `data` no cumple `updateEmailTemplateSchema` (lanzado por `.parse`).
   * @throws {Error} Con mensaje `'Plantilla no encontrada'` si no existe una plantilla con ese `id`.
   */
  async update(id: string, data: unknown) {
    const validated = updateEmailTemplateSchema.parse(data);
    const template = await EmailTemplate.findByPk(id);
    if (!template) throw new Error('Plantilla no encontrada');
    await template.update(validated as any);
    return template;
  }

  /**
   * Elimina una plantilla de correo.
   *
   * @param id - Identificador (PK) de la plantilla a eliminar.
   * @returns Promesa que resuelve a `{ message: 'Plantilla eliminada' }` si la operación tuvo éxito.
   * @throws {Error} Con mensaje `'Plantilla no encontrada'` si no existe una plantilla con ese `id`.
   */
  async remove(id: string) {
    const template = await EmailTemplate.findByPk(id);
    if (!template) throw new Error('Plantilla no encontrada');
    await template.destroy();
    return { message: 'Plantilla eliminada' };
  }
}

export const emailTemplateService = new EmailTemplateService();
