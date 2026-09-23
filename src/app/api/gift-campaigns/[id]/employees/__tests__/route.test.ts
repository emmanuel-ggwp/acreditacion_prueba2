jest.mock('@/services/giftService', () => ({
  giftService: {
    listEmployees: jest.fn(),
    createEmployee: jest.fn(),
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
  listEmployees: jest.Mock;
  createEmployee: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const ctx = { params: Promise.resolve({ id: 'c1' }) };

const makeRequest = (method: string, body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-campaigns/c1/employees', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/gift-campaigns/[id]/employees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('lista los empleados de la campaña (200)', async () => {
      const employees = [{ id: 'e1', name: 'Ana' }];
      mockedService.listEmployees.mockResolvedValue(employees);

      const res = await (GET as any)(makeRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(employees);
      expect(mockedService.listEmployees).toHaveBeenCalledWith('c1');
    });

    it('401 sin token', async () => {
      const res = await (GET as any)(makeRequest('GET', undefined, false), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });
  });

  describe('POST', () => {
    it('crea un empleado en modo MANUAL (201)', async () => {
      const created = { id: 'e9', name: 'Nuevo' };
      const payload = { name: 'Nuevo', dni: '123' };
      mockedService.createEmployee.mockResolvedValue(created);

      const res = await (POST as any)(makeRequest('POST', payload), ctx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mockedService.createEmployee).toHaveBeenCalledWith('c1', payload, 'MANUAL');
    });

    it('400 si el servicio lanza', async () => {
      mockedService.createEmployee.mockRejectedValue(new Error('datos inválidos'));

      const res = await (POST as any)(makeRequest('POST', { name: '' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'datos inválidos' });
    });

    it('403 si el rol (BD) no está autorizado para POST', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const res = await (POST as any)(makeRequest('POST', { name: 'X' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedService.createEmployee).not.toHaveBeenCalled();
    });
  });
});
