jest.mock('@/services/giftService', () => ({
  giftService: {
    updateType: jest.fn(),
    deleteType: jest.fn(),
  },
}));

jest.mock('@/lib/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { PUT, DELETE } from '../route';
import { giftService } from '@/services/giftService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = giftService as unknown as {
  updateType: jest.Mock;
  deleteType: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const ctx = { params: Promise.resolve({ id: 't1' }) };

const makeRequest = (method: string, body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-types/t1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/gift-types/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('PUT', () => {
    it('actualiza el tipo (200)', async () => {
      const payload = { name: 'Mochila', maxQty: 50 };
      const updated = { id: 't1', ...payload };
      mockedService.updateType.mockResolvedValue(updated);

      const res = await (PUT as any)(makeRequest('PUT', payload), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(updated);
      expect(mockedService.updateType).toHaveBeenCalledWith('t1', payload);
    });

    it('400 si el servicio lanza', async () => {
      mockedService.updateType.mockRejectedValue(new Error('inválido'));

      const res = await (PUT as any)(makeRequest('PUT', { name: '' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'inválido' });
    });

    it('403 si el rol (BD) no está autorizado', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const res = await (PUT as any)(makeRequest('PUT', { name: 'X' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedService.updateType).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('elimina el tipo (200)', async () => {
      mockedService.deleteType.mockResolvedValue(undefined);

      const res = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(mockedService.deleteType).toHaveBeenCalledWith('t1');
    });

    it('400 si el servicio lanza', async () => {
      mockedService.deleteType.mockRejectedValue(new Error('en uso'));

      const res = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'en uso' });
    });

    it('401 sin token', async () => {
      const res = await (DELETE as any)(makeRequest('DELETE', undefined, false), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });
  });
});
