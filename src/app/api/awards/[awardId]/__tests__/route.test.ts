// Rutas con withAuth. Se mockea el servicio (factory), verifyAccessToken y User.findByPk
// (globalmente mockeado) que withAuth consulta como fuente de verdad del rol.
jest.mock('@/services/awardService', () => ({
  awardService: {
    getAwardById: jest.fn(),
    updateAward: jest.fn(),
    deleteAward: jest.fn(),
  },
}));
jest.mock('@/lib/jwt');

import { GET, PUT, DELETE } from '../route';
import { awardService } from '@/services/awardService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = awardService as unknown as {
  getAwardById: jest.Mock;
  updateAward: jest.Mock;
  deleteAward: jest.Mock;
};
const verifyMock = verifyAccessToken as jest.Mock;
const UserMock = User as any;

const AWARD_ID = 'award-123';

const authedRequest = (method: string, body?: any, query = '') =>
  new Request(`http://localhost/api/awards/${AWARD_ID}${query}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer x',
    },
  });

const noAuthRequest = (method: string) =>
  new Request(`http://localhost/api/awards/${AWARD_ID}`, { method });

const ctx = { params: Promise.resolve({ awardId: AWARD_ID }) };

describe('/api/awards/[awardId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    verifyMock.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('devuelve el premio (200)', async () => {
      const award = { id: AWARD_ID, name: 'Premio' };
      svc.getAwardById.mockResolvedValue(award);

      const res = await (GET as any)(authedRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(award);
      expect(svc.getAwardById).toHaveBeenCalledWith(AWARD_ID);
    });

    it('devuelve 404 si el premio no existe', async () => {
      svc.getAwardById.mockResolvedValue(null);

      const res = await (GET as any)(authedRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'Award not found' });
    });

    it('devuelve 401 sin token', async () => {
      const res = await (GET as any)(noAuthRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });

    it('devuelve 500 si el servicio lanza', async () => {
      svc.getAwardById.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(authedRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });
  });

  describe('PUT', () => {
    it('actualiza el premio (200)', async () => {
      const updated = { id: AWARD_ID, name: 'Nuevo nombre' };
      svc.updateAward.mockResolvedValue(updated);

      const res = await (PUT as any)(authedRequest('PUT', { name: 'Nuevo nombre' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(updated);
      expect(svc.updateAward).toHaveBeenCalledWith(AWARD_ID, { name: 'Nuevo nombre' }, 'u1');
    });

    it('devuelve 400 con datos inválidos (quantity negativo)', async () => {
      const res = await (PUT as any)(authedRequest('PUT', { quantity: -5 }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(svc.updateAward).not.toHaveBeenCalled();
    });

    it('devuelve 500 si el servicio lanza', async () => {
      svc.updateAward.mockRejectedValue(new Error('boom'));

      const res = await (PUT as any)(authedRequest('PUT', { name: 'Nuevo nombre' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });
  });

  describe('DELETE', () => {
    it('elimina el premio (200) y pasa el motivo', async () => {
      svc.deleteAward.mockResolvedValue(undefined);

      const res = await (DELETE as any)(authedRequest('DELETE', undefined, '?reason=duplicado'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ message: 'Award deleted successfully' });
      expect(svc.deleteAward).toHaveBeenCalledWith(AWARD_ID, 'u1', 'duplicado');
    });

    it('devuelve 403 para un rol sin permiso de borrado (OPERATOR)', async () => {
      // DELETE solo permite [ADMIN, MANAGER]; el rol efectivo sale de la BD.
      UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'OPERATOR' });

      const res = await (DELETE as any)(authedRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.deleteAward).not.toHaveBeenCalled();
    });

    it('devuelve 500 si el servicio lanza', async () => {
      svc.deleteAward.mockRejectedValue(new Error('boom'));

      const res = await (DELETE as any)(authedRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });
  });
});
