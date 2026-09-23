// Prueba unitaria del handler PATCH de /api/participant-awards/[participantAwardId]/deliver.
// Roles permitidos: ADMIN, MANAGER, OPERATOR, GUARDIA.
jest.mock('@/services/participantAwardService', () => ({
  participantAwardService: { deliverAward: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { PATCH } from '../route';
import { participantAwardService } from '@/services/participantAwardService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = participantAwardService as unknown as { deliverAward: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (withToken = true) =>
  new Request('http://localhost/api/participant-awards/pa1/deliver', {
    method: 'PATCH',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

const ctx = (participantAwardId: string) => ({ params: Promise.resolve({ participantAwardId }) });

describe('PATCH /api/participant-awards/[participantAwardId]/deliver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('entrega el premio y devuelve el registro de entrega', async () => {
    const delivery = { id: 'd1', participantAwardId: 'pa1', deliveredBy: 'u1' };
    mockedService.deliverAward.mockResolvedValue(delivery);

    const res = await (PATCH as any)(makeRequest(), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(delivery);
    // Se pasa (participantAwardId, deliveredBy = id del usuario autenticado).
    expect(mockedService.deliverAward).toHaveBeenCalledWith('pa1', 'u1');
  });

  it('devuelve 400 si el participantAwardId viene vacío', async () => {
    const res = await (PATCH as any)(makeRequest(), ctx(''));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid participant award ID' });
    expect(mockedService.deliverAward).not.toHaveBeenCalled();
  });

  it('devuelve 500 si el servicio lanza', async () => {
    mockedService.deliverAward.mockRejectedValue(new Error('ya entregado'));

    const res = await (PATCH as any)(makeRequest(), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe('Error delivering award');
    expect(body.error).toBe('ya entregado');
  });

  it('permite al rol GUARDIA (autorizado en esta ruta)', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
    mockedService.deliverAward.mockResolvedValue({ ok: true });

    const res = await (PATCH as any)(makeRequest(), ctx('pa1'));

    expect(res.status).toBe(200);
    expect(mockedService.deliverAward).toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (PATCH as any)(makeRequest(false), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
