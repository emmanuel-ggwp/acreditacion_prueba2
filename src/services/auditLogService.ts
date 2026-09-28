/**
 * Servicio de registro de auditoría (AuditLog).
 *
 * Centraliza la escritura y consulta del historial de acciones del sistema
 * (logins, altas, cambios, bajas). La escritura es "best-effort": nunca lanza
 * ni interrumpe la operación de negocio que la invoca. Además ofrece un ayudante
 * para calcular el diff de campos que se guarda en `details.changes`.
 */
import { AuditLog, User } from '@/models/index';
import { AuditAction } from '@/models/AuditLog';

/**
 * Datos de una entrada de auditoría.
 *
 * @property userId - Identificador del usuario que realiza la acción (actor).
 * @property action - Tipo de acción auditada (`AuditAction`, p. ej. CREATE, UPDATE, DELETE, LOGIN, LOGOUT).
 * @property entity - Nombre de la entidad afectada (p. ej. `'User'`).
 * @property entityId - Identificador opcional del registro afectado.
 * @property details - Objeto opcional con contexto adicional (p. ej. `{ changes, name, reason }`).
 */
interface LogData {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: object;
}

/**
 * Encapsula la escritura y lectura del registro de auditoría.
 */
export class AuditLogService {
  /**
   * Escribe una entrada en el registro de auditoría (operación best-effort).
   *
   * Si la inserción falla, captura el error y lo registra en consola, pero NO lo
   * relanza: la auditoría nunca debe romper la operación de negocio que la llama.
   *
   * @param data - Datos de la entrada a registrar (ver {@link LogData}).
   * @returns Promesa que resuelve a `void` tanto si la escritura tuvo éxito como si falló silenciosamente.
   */
  async log(data: LogData) {
    try {
      await AuditLog.create(data as any);
    } catch (error) {
      console.error('Failed to write to audit log:', error);
      // In a production environment, you might want to send this to a more robust logging service
    }
  }

  // Calcula { campo: {from, to} } comparando dos snapshots planos para las claves dadas.
  /**
   * Calcula el diff `{ campo: { from, to } }` comparando dos snapshots planos.
   *
   * Compara clave a clave usando `JSON.stringify` (comparación por valor
   * serializado) e incluye solo las claves cuyo valor cambió.
   *
   * @param before - Snapshot del estado anterior (objeto plano; puede ser nulo).
   * @param after - Snapshot del estado posterior (objeto plano; puede ser nulo).
   * @param keys - Lista de claves a comparar entre ambos snapshots.
   * @returns Objeto con una entrada `{ from, to }` por cada clave que cambió (valores ausentes se normalizan a `null`); vacío si no hubo cambios.
   */
  buildChanges(before: any, after: any, keys: string[]) {
    const changes: Record<string, { from: any; to: any }> = {};
    for (const k of keys) {
      if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) {
        changes[k] = { from: before?.[k] ?? null, to: after?.[k] ?? null };
      }
    }
    return changes;
  }

  /**
   * Lista entradas de auditoría, opcionalmente filtradas, con datos del usuario actor.
   *
   * Incluye el `User` asociado (solo `id`, `firstName`, `lastName`, `email`) y
   * ordena por fecha de creación descendente (más recientes primero).
   *
   * @param filters - Filtros opcionales.
   * @param filters.action - Filtra por tipo de acción (`AuditAction`).
   * @param filters.entity - Filtra por nombre de entidad.
   * @param filters.limit - Máximo de resultados; si es ausente o ≤ 0 se usa el valor por defecto de 200.
   * @returns Promesa que resuelve al arreglo de entradas de auditoría (`AuditLog[]`) que cumplen los filtros.
   */
  async list(filters: { action?: AuditAction; entity?: string; limit?: number } = {}) {
    const where: any = {};
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    return AuditLog.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: filters.limit && filters.limit > 0 ? filters.limit : 200,
    });
  }
}

export const auditLogService = new AuditLogService();
