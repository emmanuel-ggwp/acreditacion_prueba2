/**
 * Servicio de registro de auditoría (AuditLog).
 *
 * Centraliza la escritura y consulta del historial de acciones del sistema
 * (logins, altas, cambios, bajas). La escritura es "best-effort": nunca lanza
 * ni interrumpe la operación de negocio que la invoca. Además ofrece un ayudante
 * para calcular el diff de campos que se guarda en `details.changes`.
 */
import { Op } from 'sequelize';
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
  // Evento al que pertenece el log (lo pasan las acreditaciones), para el filtro por evento.
  eventId?: string;
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
   * Compara clave a clave e incluye solo las claves cuyo valor cambió. `null`,
   * `undefined` y `''` se consideran el MISMO valor "vacío": así no se registran
   * cambios falsos tipo `(vacío) → (vacío)` cuando un campo pasa de `null` (BD) a `''`
   * (formulario) o viceversa. Un `0` o `false` NO son vacíos y sí se comparan.
   *
   * @param before - Snapshot del estado anterior (objeto plano; puede ser nulo).
   * @param after - Snapshot del estado posterior (objeto plano; puede ser nulo).
   * @param keys - Lista de claves a comparar entre ambos snapshots.
   * @returns Objeto con una entrada `{ from, to }` por cada clave que cambió (valores ausentes se normalizan a `null`); vacío si no hubo cambios.
   */
  buildChanges(before: any, after: any, keys: string[]) {
    // null / undefined / '' → mismo "vacío" (null) para la COMPARACIÓN.
    const norm = (v: any) => (v === undefined || v === null || v === '' ? null : v);
    const changes: Record<string, { from: any; to: any }> = {};
    for (const k of keys) {
      if (JSON.stringify(norm(before?.[k])) !== JSON.stringify(norm(after?.[k]))) {
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
   * Por defecto OCULTA los barridos automáticos del sistema (`SYSTEM-BULK-UPDATE`),
   * que son ruido operativo; se ven eligiendo esa acción explícitamente en el filtro.
   *
   * @param filters - Filtros opcionales.
   * @param filters.action - Filtra por tipo de acción (`AuditAction`). Si se omite, se
   *   devuelven todas MENOS `SYSTEM-BULK-UPDATE`.
   * @param filters.entity - Filtra por nombre de entidad.
   * @param filters.eventId - Filtra por EVENTO: como solo las acreditaciones guardan la
   *   fecha (`eventScheduleId`) en `details`, un filtro por evento devuelve su actividad
   *   de acreditación (acreditó/des-acreditó). Se resuelven las fechas del evento y se
   *   filtra el JSON de `details`.
   * @param filters.limit - Máximo de resultados; si es ausente o ≤ 0 se usa el valor por defecto de 200.
   * @returns Promesa que resuelve al arreglo de entradas de auditoría (`AuditLog[]`) que cumplen los filtros.
   */
  async list(filters: { action?: AuditAction; entity?: string; eventId?: string; limit?: number } = {}) {
    const where: any = {};
    if (filters.eventId) {
      // Filtro por evento: por la columna indexada `event_id` (la rellenan las
      // acreditaciones), acotado a sus acciones CREATE/DELETE.
      where.eventId = filters.eventId;
      where.entity = 'Accreditation';
      where.action = (filters.action === 'CREATE' || filters.action === 'DELETE')
        ? filters.action
        : { [Op.in]: ['CREATE', 'DELETE'] };
    } else {
      if (filters.action) {
        where.action = filters.action;
      } else {
        // Sin filtro de acción: ocultar los barridos automáticos del sistema.
        where.action = { [Op.ne]: 'SYSTEM-BULK-UPDATE' };
      }
      if (filters.entity) where.entity = filters.entity;
    }
    return AuditLog.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: filters.limit && filters.limit > 0 ? filters.limit : 200,
    });
  }
}

export const auditLogService = new AuditLogService();
