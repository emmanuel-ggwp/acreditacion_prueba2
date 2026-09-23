// Rutas con withAuth [ADMIN]. Factory-mock del servicio, verifyAccessToken y User.findByPk.
jest.mock('@/services/userService', () => ({
  userService: { update: jest.fn(), remove: jest.fn() },
}));
jest.mock('@/lib/jwt');

import { PUT, DELETE } from '../route';
import { userService } from '@/services/userService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = userService as unknown as { update: jest.Mock; remove: jest.Mock };
const verifyMock = verifyAccessToken as jest.Mock;
const UserMock = User as any;

const USER_ID = 'user-999';

const authedRequest = (method: string, body?: any, query = '') =>
  new Request(`http://localhost/api/users/${USER_ID}${query}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const noAuthRequest = (method: string) =>
  new Request(`http://localhost/api/users/${USER_ID}`, { method });

const ctx = { params: Promise.resolve({ id: USER_ID }) };

describe('/api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyMock.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('PUT', () => {
    it('actualiza el usuario (200) y pasa el actor', async () => {
      const updated = { id: USER_ID, firstName: 'Nuevo' };
      svc.update.mockResolvedValue(updated);

      const res = await (PUT as any)(authedRequest('PUT', { firstName: 'Nuevo' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(updated);
      expect(svc.update).toHaveBeenCalledWith(USER_ID, { firstName: 'Nuevo' }, 'u1');
    });

    it('devuelve 400 si el servicio lanza', async () => {
      svc.update.mockRejectedValue(new Error('Rol inválido.'));

      const res = await (PUT as any)(authedRequest('PUT', { role: 'X' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Rol inválido.' });
    });

    it('devuelve 401 sin token', async () => {
      const res = await (PUT as any)(noAuthRequest('PUT'), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });
  });

  describe('DELETE', () => {
    it('elimina el usuario (200) y pasa actor y motivo', async () => {
      svc.remove.mockResolvedValue(undefined);

      const res = await (DELETE as any)(authedRequest('DELETE', undefined, '?reason=baja'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(svc.remove).toHaveBeenCalledWith(USER_ID, 'u1', 'baja');
    });

    it('devuelve 400 si el servicio lanza', async () => {
      svc.remove.mockRejectedValue(new Error('No puedes eliminar tu propia cuenta.'));

      const res = await (DELETE as any)(authedRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'No puedes eliminar tu propia cuenta.' });
    });

    it('devuelve 403 para un no-ADMIN', async () => {
      UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const res = await (DELETE as any)(authedRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.remove).not.toHaveBeenCalled();
    });
  });
});
