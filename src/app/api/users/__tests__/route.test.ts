// Rutas con withAuth [ADMIN]. Factory-mock del servicio, verifyAccessToken y User.findByPk.
jest.mock('@/services/userService', () => ({
  userService: { list: jest.fn(), create: jest.fn() },
}));
jest.mock('@/lib/jwt');

import { GET, POST } from '../route';
import { userService } from '@/services/userService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = userService as unknown as { list: jest.Mock; create: jest.Mock };
const verifyMock = verifyAccessToken as jest.Mock;
const UserMock = User as any;

const authedRequest = (method: string, body?: any) =>
  new Request('http://localhost/api/users', {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const noAuthRequest = (method: string) =>
  new Request('http://localhost/api/users', { method });

const ctx = { params: {} };

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyMock.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('lista los usuarios (200)', async () => {
      const users = [{ id: 'u1', username: 'admin' }];
      svc.list.mockResolvedValue(users);

      const res = await (GET as any)(authedRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(users);
      expect(svc.list).toHaveBeenCalled();
    });

    it('devuelve 401 sin token', async () => {
      const res = await (GET as any)(noAuthRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });

    it('devuelve 403 para un no-ADMIN', async () => {
      UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'OPERATOR' });

      const res = await (GET as any)(authedRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.list).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('crea un usuario (201) y pasa el actor', async () => {
      const created = { id: 'u2', username: 'nuevo' };
      const input = { username: 'nuevo', email: 'n@e.com', password: 'Password123!', role: 'OPERATOR' };
      svc.create.mockResolvedValue(created);

      const res = await (POST as any)(authedRequest('POST', input), ctx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(svc.create).toHaveBeenCalledWith(input, 'u1');
    });

    it('devuelve 400 si el servicio lanza (validación de negocio)', async () => {
      svc.create.mockRejectedValue(new Error('Ya existe un usuario con ese correo o nombre de usuario.'));

      const res = await (POST as any)(authedRequest('POST', { username: 'x' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Ya existe un usuario con ese correo o nombre de usuario.' });
    });
  });
});
