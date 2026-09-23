import { AuditLogService } from '../auditLogService';
import { AuditLog, User } from '@/models/index';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const AuditLogMock = AuditLog as jest.Mocked<typeof AuditLog>;

describe('AuditLogService', () => {
  let auditLogService: AuditLogService;

  beforeEach(() => {
    auditLogService = new AuditLogService();
    jest.clearAllMocks();
  });

  describe('log', () => {
    const data = {
      userId: 'user-1',
      action: 'CREATE' as const,
      entity: 'Event',
      entityId: 'event-1',
      details: { name: 'Fiesta' },
    };

    it('should write the entry through AuditLog.create', async () => {
      (AuditLogMock.create as jest.Mock).mockResolvedValue({ id: 'log-1' });

      await auditLogService.log(data);

      expect(AuditLogMock.create).toHaveBeenCalledTimes(1);
      expect(AuditLogMock.create).toHaveBeenCalledWith(data);
    });

    it('should swallow errors and log them without throwing', async () => {
      const boom = new Error('db down');
      (AuditLogMock.create as jest.Mock).mockRejectedValue(boom);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // No debe propagar el error (la auditoría no debe romper el flujo principal).
      await expect(auditLogService.log(data)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to write to audit log:', boom);
      consoleSpy.mockRestore();
    });
  });

  describe('buildChanges', () => {
    it('returns an empty object when nothing changed', () => {
      const result = auditLogService.buildChanges(
        { name: 'a', qty: 10 },
        { name: 'a', qty: 10 },
        ['name', 'qty']
      );
      expect(result).toEqual({});
    });

    it('records only the keys whose values differ', () => {
      const result = auditLogService.buildChanges(
        { name: 'old', qty: 10 },
        { name: 'new', qty: 10 },
        ['name', 'qty']
      );
      expect(result).toEqual({ name: { from: 'old', to: 'new' } });
    });

    it('records several changed keys', () => {
      const result = auditLogService.buildChanges(
        { a: 1, b: 2, c: 3 },
        { a: 1, b: 20, c: 30 },
        ['a', 'b', 'c']
      );
      expect(result).toEqual({
        b: { from: 2, to: 20 },
        c: { from: 3, to: 30 },
      });
    });

    it('coalesces a missing "before" value to null', () => {
      const result = auditLogService.buildChanges(
        {},
        { name: 'created' },
        ['name']
      );
      expect(result).toEqual({ name: { from: null, to: 'created' } });
    });

    it('coalesces a missing "after" value to null', () => {
      const result = auditLogService.buildChanges(
        { name: 'was here' },
        {},
        ['name']
      );
      expect(result).toEqual({ name: { from: 'was here', to: null } });
    });

    it('handles an undefined before snapshot without throwing', () => {
      const result = auditLogService.buildChanges(undefined, { name: 'x' }, ['name']);
      expect(result).toEqual({ name: { from: null, to: 'x' } });
    });

    it('handles an undefined after snapshot without throwing', () => {
      const result = auditLogService.buildChanges({ name: 'x' }, undefined, ['name']);
      expect(result).toEqual({ name: { from: 'x', to: null } });
    });

    it('treats falsy-but-present values (0) as real values, not null', () => {
      const result = auditLogService.buildChanges({ x: 0 }, { x: null }, ['x']);
      expect(result).toEqual({ x: { from: 0, to: null } });
    });

    it('deep-compares nested objects via JSON serialization', () => {
      const same = auditLogService.buildChanges(
        { meta: { a: 1 } },
        { meta: { a: 1 } },
        ['meta']
      );
      expect(same).toEqual({});

      const diff = auditLogService.buildChanges(
        { meta: { a: 1 } },
        { meta: { a: 2 } },
        ['meta']
      );
      expect(diff).toEqual({ meta: { from: { a: 1 }, to: { a: 2 } } });
    });

    it('returns an empty object when no keys are requested', () => {
      const result = auditLogService.buildChanges({ a: 1 }, { a: 2 }, []);
      expect(result).toEqual({});
    });
  });

  describe('list', () => {
    const rows = [{ id: 'log-1' }, { id: 'log-2' }];

    it('queries with an empty where and default limit of 200 when no filters', async () => {
      (AuditLogMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await auditLogService.list();

      expect(AuditLogMock.findAll).toHaveBeenCalledWith({
        where: {},
        include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }],
        order: [['createdAt', 'DESC']],
        limit: 200,
      });
      expect(result).toBe(rows);
    });

    it('applies the action filter to the where clause', async () => {
      (AuditLogMock.findAll as jest.Mock).mockResolvedValue(rows);

      await auditLogService.list({ action: 'DELETE' });

      expect(AuditLogMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { action: 'DELETE' } })
      );
    });

    it('applies the entity filter to the where clause', async () => {
      (AuditLogMock.findAll as jest.Mock).mockResolvedValue(rows);

      await auditLogService.list({ entity: 'Event' });

      expect(AuditLogMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entity: 'Event' } })
      );
    });

    it('combines action and entity filters', async () => {
      (AuditLogMock.findAll as jest.Mock).mockResolvedValue(rows);

      await auditLogService.list({ action: 'UPDATE', entity: 'Award' });

      expect(AuditLogMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { action: 'UPDATE', entity: 'Award' } })
      );
    });

    it('honours a positive limit', async () => {
      (AuditLogMock.findAll as jest.Mock).mockResolvedValue(rows);

      await auditLogService.list({ limit: 25 });

      expect(AuditLogMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 })
      );
    });

    it('falls back to 200 when the limit is zero or negative', async () => {
      (AuditLogMock.findAll as jest.Mock).mockResolvedValue(rows);

      await auditLogService.list({ limit: 0 });
      expect(AuditLogMock.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 200 })
      );

      await auditLogService.list({ limit: -5 });
      expect(AuditLogMock.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 200 })
      );
    });
  });
});
