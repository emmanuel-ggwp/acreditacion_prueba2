// Prueba unitaria de GET /api/participants/[participantId]/awards.
jest.mock('@/services/participantAwardService', () => ({
  participantAwardService: { listParticipantAwards: jest.fn() },
}));

jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { participantAwardService } from '@/services/participantAwardService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = participantAwardService as unknown as { listParticipantAwards: jest.Mock };

const PID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (withToken = true) =>
  new Request(`http://localhost/api/participants/${PID}/awards`, {
    method: 'GET',
    headers: { ...(withToken ? { Authorization: 'Bearer x' } : {}) },
  });

const ctxWith = (participantId: any) => ({ params: Promise.resolve({ participantId }) });

describe('GET /api/participants/[participantId]/awards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('lista los premios del participante', async () => {
    const awards = [{ id: 'a1', name: 'Premio' }];
    svc.listParticipantAwards.mockResolvedValue(awards);

    const response = await (GET as any)(makeRequest(), ctxWith(PID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(awards);
    expect(svc.listParticipantAwards).toHaveBeenCalledWith(PID);
  });

  it('permite el rol GUARDIA', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
    svc.listParticipantAwards.mockResolvedValue([]);

    const response = await (GET as any)(makeRequest(), ctxWith(PID));
    expect(response.status).toBe(200);
    expect(svc.listParticipantAwards).toHaveBeenCalled();
  });

  it('responde 400 si el participantId es vacío', async () => {
    const response = await (GET as any)(makeRequest(), ctxWith(''));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid participant ID' });
    expect(svc.listParticipantAwards).not.toHaveBeenCalled();
  });

  it('responde 500 si el servicio falla', async () => {
    svc.listParticipantAwards.mockRejectedValue(new Error('db caida'));

    const response = await (GET as any)(makeRequest(), ctxWith(PID));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: 'Error fetching participant awards', error: 'db caida' });
  });

  it('responde 403 si el rol no está permitido (MANAGER)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const response = await (GET as any)(makeRequest(), ctxWith(PID));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(svc.listParticipantAwards).not.toHaveBeenCalled();
  });

  it('responde 401 sin token', async () => {
    const response = await (GET as any)(makeRequest(false), ctxWith(PID));
    expect(response.status).toBe(401);
    expect(svc.listParticipantAwards).not.toHaveBeenCalled();
  });
});
