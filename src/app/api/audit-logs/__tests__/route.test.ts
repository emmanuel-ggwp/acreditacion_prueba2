// Prueba unitaria del handler GET de /api/audit-logs. Solo ADMIN.
jest.mock('@/services/auditLogService', () => ({
  auditLogService: { list: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { auditLogService } from '@/services/auditLogService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = auditLogService as unknown as { list: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (url: string, withToken = true) =>
  new Request(url, {
    method: 'GET',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

describe('GET /api/audit-logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve los logs con los filtros por defecto (limit 200)', async () => {
    const logs = [{ id: 1, action: 'LOGIN' }];
    mockedService.list.mockResolvedValue(logs);

    const res = await (GET as any)(makeRequest('http://localhost/api/audit-logs'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(logs);
    expect(mockedService.list).toHaveBeenCalledWith({ action: undefined, entity: undefined, limit: 200 });
  });

  it('pasa action, entity y limit desde el query', async () => {
    mockedService.list.mockResolvedValue([]);

    const res = await (GET as any)(
      makeRequest('http://localhost/api/audit-logs?action=DELETE&entity=User&limit=50'),
      { params: {} }
    );

    expect(res.status).toBe(200);
    expect(mockedService.list).toHaveBeenCalledWith({ action: 'DELETE', entity: 'User', limit: 50 });
  });

  it('devuelve 500 con el mensaje del error si el servicio lanza', async () => {
    mockedService.list.mockRejectedValue(new Error('fallo consulta'));

    const res = await (GET as any)(makeRequest('http://localhost/api/audit-logs'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'fallo consulta' });
  });

  it('devuelve 403 para un rol que no es ADMIN', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const res = await (GET as any)(makeRequest('http://localhost/api/audit-logs'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mockedService.list).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/audit-logs', false), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
