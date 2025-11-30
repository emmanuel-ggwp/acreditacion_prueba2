import AuditLog, { AuditAction } from '../models/AuditLog';

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
      await AuditLog.create(data);
    } catch (error) {
      console.error('Failed to write to audit log:', error);
      // In a production environment, you might want to send this to a more robust logging service
    }
  }
}

export const auditLogService = new AuditLogService();
