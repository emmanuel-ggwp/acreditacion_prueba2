import { AuditLog, User } from '@/models/index';
import { AuditAction } from '@/models/AuditLog';

interface LogData {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: object;
}

export class AuditLogService {
  async log(data: LogData) {
    try {
      await AuditLog.create(data as any);
    } catch (error) {
      console.error('Failed to write to audit log:', error);
      // In a production environment, you might want to send this to a more robust logging service
    }
  }

  // Calcula { campo: {from, to} } comparando dos snapshots planos para las claves dadas.
  buildChanges(before: any, after: any, keys: string[]) {
    const changes: Record<string, { from: any; to: any }> = {};
    for (const k of keys) {
      if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) {
        changes[k] = { from: before?.[k] ?? null, to: after?.[k] ?? null };
      }
    }
    return changes;
  }

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
