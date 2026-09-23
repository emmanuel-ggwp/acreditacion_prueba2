jest.mock('@/services/giftService', () => ({
  giftService: {
    updateEmployee: jest.fn(),
    deleteEmployee: jest.fn(),
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
  updateEmployee: jest.Mock;
  deleteEmployee: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const ctx = { params: Promise.resolve({ id: 'e1' }) };

const makeRequest = (method: string, body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-employees/e1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/gift-employees/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('PUT', () => {
    it('actualiza el empleado (200)', async () => {
      const payload = { name: 'Ana María' };
      const updated = { id: 'e1', ...payload };
      mockedService.updateEmployee.mockResolvedValue(updated);

      const res = await (PUT as any)(makeRequest('PUT', payload), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(updated);
      expect(mockedService.updateEmployee).toHaveBeenCalledWith('e1', payload);
    });

    it('400 si el servicio lanza', async () => {
      mockedService.updateEmployee.mockRejectedValue(new Error('inválido'));

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
      expect(mockedService.updateEmployee).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('elimina el empleado (200)', async () => {
      mockedService.deleteEmployee.mockResolvedValue(undefined);

      const res = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(mockedService.deleteEmployee).toHaveBeenCalledWith('e1');
    });

    it('400 si el servicio lanza', async () => {
      mockedService.deleteEmployee.mockRejectedValue(new Error('no se puede'));

      const res = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'no se puede' });
    });

    it('401 sin token', async () => {
      const res = await (DELETE as any)(makeRequest('DELETE', undefined, false), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });
  });
});
