jest.mock('@/services/giftService', () => ({
  giftService: {
    listTypes: jest.fn(),
    createType: jest.fn(),
  },
}));

jest.mock('@/lib/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { GET, POST } from '../route';
import { giftService } from '@/services/giftService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = giftService as unknown as {
  listTypes: jest.Mock;
  createType: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const ctx = { params: Promise.resolve({ id: 'c1' }) };

const makeRequest = (method: string, body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-campaigns/c1/types', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/gift-campaigns/[id]/types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('lista los tipos de la campaña (200)', async () => {
      const types = [{ id: 't1', name: 'Polo' }];
      mockedService.listTypes.mockResolvedValue(types);

      const res = await (GET as any)(makeRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(types);
      expect(mockedService.listTypes).toHaveBeenCalledWith('c1');
    });

    it('401 sin token', async () => {
      const res = await (GET as any)(makeRequest('GET', undefined, false), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });
  });

  describe('POST', () => {
    it('crea un tipo (201)', async () => {
      const payload = { name: 'Gorra', maxQty: 100 };
      const created = { id: 't9', ...payload };
      mockedService.createType.mockResolvedValue(created);

      const res = await (POST as any)(makeRequest('POST', payload), ctx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mockedService.createType).toHaveBeenCalledWith('c1', payload);
    });

    it('400 si el servicio lanza', async () => {
      mockedService.createType.mockRejectedValue(new Error('tipo inválido'));

      const res = await (POST as any)(makeRequest('POST', { name: '' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'tipo inválido' });
    });

    it('403 si el rol (BD) no está autorizado para POST', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const res = await (POST as any)(makeRequest('POST', { name: 'X' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedService.createType).not.toHaveBeenCalled();
    });
  });
});
