jest.mock('@/services/giftService', () => ({
  giftService: {
    importEmployees: jest.fn(),
  },
}));

jest.mock('@/lib/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { POST } from '../route';
import { giftService } from '@/services/giftService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = giftService as unknown as {
  importEmployees: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const ctx = { params: Promise.resolve({ id: 'c1' }) };

const makeRequest = (body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-campaigns/c1/employees/import', {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('POST /api/gift-campaigns/[id]/employees/import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('importa las filas del cuerpo y devuelve el resultado (200)', async () => {
    const rows = [{ dni: '1', name: 'Ana' }, { dni: '2', name: 'Luis' }];
    const result = { created: 2, updated: 0, errors: [] };
    mockedService.importEmployees.mockResolvedValue(result);

    const res = await (POST as any)(makeRequest({ rows }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(mockedService.importEmployees).toHaveBeenCalledWith('c1', rows);
  });

  it('si "rows" no es un array, pasa un array vacío al servicio', async () => {
    const result = { created: 0, updated: 0, errors: [] };
    mockedService.importEmployees.mockResolvedValue(result);

    const res = await (POST as any)(makeRequest({ rows: 'no-array' }), ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(mockedService.importEmployees).toHaveBeenCalledWith('c1', []);
  });

  it('400 si el servicio lanza', async () => {
    mockedService.importEmployees.mockRejectedValue(new Error('CSV inválido'));

    const res = await (POST as any)(makeRequest({ rows: [{ dni: '1' }] }), ctx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'CSV inválido' });
  });

  it('401 sin token', async () => {
    const res = await (POST as any)(makeRequest({ rows: [] }, false), ctx);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(mockedService.importEmployees).not.toHaveBeenCalled();
  });
});
