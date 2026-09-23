// Prueba unitaria del handler DELETE de /api/participant-awards/[participantAwardId]/cancel.
// Roles permitidos: ADMIN, MANAGER, OPERATOR (no GUARDIA → sirve para el 403).
jest.mock('@/services/participantAwardService', () => ({
  participantAwardService: { cancelAwardAssignment: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { DELETE } from '../route';
import { participantAwardService } from '@/services/participantAwardService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = participantAwardService as unknown as { cancelAwardAssignment: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (withToken = true) =>
  new Request('http://localhost/api/participant-awards/pa1/cancel', {
    method: 'DELETE',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

const ctx = (participantAwardId: string) => ({ params: Promise.resolve({ participantAwardId }) });

describe('DELETE /api/participant-awards/[participantAwardId]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('cancela la asignación y responde 200', async () => {
    mockedService.cancelAwardAssignment.mockResolvedValue(undefined);

    const res = await (DELETE as any)(makeRequest(), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ message: 'Award assignment cancelled successfully' });
    // El id del usuario autenticado (de la BD) se pasa al servicio.
    expect(mockedService.cancelAwardAssignment).toHaveBeenCalledWith('pa1', 'u1');
  });

  it('devuelve 400 si el participantAwardId viene vacío', async () => {
    const res = await (DELETE as any)(makeRequest(), ctx(''));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid participant award ID' });
    expect(mockedService.cancelAwardAssignment).not.toHaveBeenCalled();
  });

  it('devuelve 500 si el servicio lanza', async () => {
    mockedService.cancelAwardAssignment.mockRejectedValue(new Error('no se pudo'));

    const res = await (DELETE as any)(makeRequest(), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe('Error cancelling award assignment');
    expect(body.error).toBe('no se pudo');
  });

  it('devuelve 403 para el rol GUARDIA (no autorizado)', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (DELETE as any)(makeRequest(), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mockedService.cancelAwardAssignment).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (DELETE as any)(makeRequest(false), ctx('pa1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
