// Prueba unitaria de POST /api/participants/[participantId]/revert.
// La ruta hace `new ParticipantService()` en la carga del módulo.
jest.mock('@/services/participantService', () => {
  const svc = {
    createParticipant: jest.fn(),
    getParticipant: jest.fn(),
    updateParticipant: jest.fn(),
    deleteParticipant: jest.fn(),
    revertToPreloaded: jest.fn(),
    setGuestDates: jest.fn(),
  };
  return {
    ParticipantService: jest.fn(() => svc),
    participantService: svc,
  };
});

jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST } from '../route';
import { participantService } from '@/services/participantService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = participantService as unknown as { revertToPreloaded: jest.Mock };

const PID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (withToken = true) =>
  new Request(`http://localhost/api/participants/${PID}/revert`, {
    method: 'POST',
    headers: { ...(withToken ? { Authorization: 'Bearer x' } : {}) },
  });

const ctx = { params: Promise.resolve({ participantId: PID }) };

describe('POST /api/participants/[participantId]/revert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('revierte el participante a precargado y responde 200', async () => {
    const result = { id: PID, status: 'preloaded' };
    svc.revertToPreloaded.mockResolvedValue(result);

    const response = await (POST as any)(makeRequest(), ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(result);
    expect(svc.revertToPreloaded).toHaveBeenCalledWith(PID, 'u1');
  });

  it('propaga el statusCode del error del servicio (404)', async () => {
    const err: any = new Error('Participante no encontrado');
    err.statusCode = 404;
    svc.revertToPreloaded.mockRejectedValue(err);

    const response = await (POST as any)(makeRequest(), ctx);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ message: 'Participante no encontrado' });
  });

  it('usa 500 cuando el error no trae statusCode', async () => {
    svc.revertToPreloaded.mockRejectedValue(new Error('boom'));

    const response = await (POST as any)(makeRequest(), ctx);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe('boom');
  });

  it('responde 403 si el rol no está permitido (MANAGER)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const response = await (POST as any)(makeRequest(), ctx);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(svc.revertToPreloaded).not.toHaveBeenCalled();
  });

  it('responde 401 sin token', async () => {
    const response = await (POST as any)(makeRequest(false), ctx);
    expect(response.status).toBe(401);
    expect(svc.revertToPreloaded).not.toHaveBeenCalled();
  });
});
