jest.mock('@/services/giftService', () => ({
  giftService: {
    setDelivery: jest.fn(),
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
  setDelivery: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-deliveries', {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('POST /api/gift-deliveries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('registra una entrega e incluye el id del usuario autenticado', async () => {
    const delivery = { id: 'd1', deliveredQty: 2 };
    mockedService.setDelivery.mockResolvedValue(delivery);

    const res = await (POST as any)(
      makeRequest({ employeeId: 'e1', giftTypeId: 't1', deliveredQty: 2 }),
      { params: {} }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(delivery);
    // req.user.id proviene del token verificado + BD ('u1').
    expect(mockedService.setDelivery).toHaveBeenCalledWith('e1', 't1', 2, 'u1');
  });

  it('400 si falta employeeId o giftTypeId', async () => {
    const res = await (POST as any)(makeRequest({ giftTypeId: 't1' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'employeeId y giftTypeId son obligatorios' });
    expect(mockedService.setDelivery).not.toHaveBeenCalled();
  });

  it('400 si el servicio lanza (p. ej. supera el máximo)', async () => {
    mockedService.setDelivery.mockRejectedValue(new Error('Supera el máximo'));

    const res = await (POST as any)(
      makeRequest({ employeeId: 'e1', giftTypeId: 't1', deliveredQty: 99 }),
      { params: {} }
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Supera el máximo' });
  });

  it('401 sin token', async () => {
    const res = await (POST as any)(
      makeRequest({ employeeId: 'e1', giftTypeId: 't1' }, false),
      { params: {} }
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(mockedService.setDelivery).not.toHaveBeenCalled();
  });
});
