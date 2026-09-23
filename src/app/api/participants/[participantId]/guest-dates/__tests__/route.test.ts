// Prueba unitaria de POST /api/participants/[participantId]/guest-dates.
// La ruta usa el singleton `participantService`.
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

const svc = participantService as unknown as { setGuestDates: jest.Mock };

const PID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (body: any, withToken = true) =>
  new Request(`http://localhost/api/participants/${PID}/guest-dates`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

const ctx = { params: Promise.resolve({ participantId: PID }) };

describe('POST /api/participants/[participantId]/guest-dates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('asigna invitados por fecha y responde 200', async () => {
    const guests = [{ firstName: 'Ana', scheduleIds: ['s1'] }];
    const result = { updated: 1 };
    svc.setGuestDates.mockResolvedValue(result);

    const response = await (POST as any)(makeRequest({ guests }), ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(result);
    expect(svc.setGuestDates).toHaveBeenCalledWith(PID, guests, 'u1');
  });

  it('trata un body sin array guests como lista vacía', async () => {
    svc.setGuestDates.mockResolvedValue({ updated: 0 });

    await (POST as any)(makeRequest({}), ctx);

    expect(svc.setGuestDates).toHaveBeenCalledWith(PID, [], 'u1');
  });

  it('responde 400 con el mensaje del error del servicio', async () => {
    svc.setGuestDates.mockRejectedValue(new Error('Fecha inválida'));

    const response = await (POST as any)(makeRequest({ guests: [] }), ctx);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ message: 'Fecha inválida' });
  });

  it('responde 403 si el rol no está permitido (MANAGER)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const response = await (POST as any)(makeRequest({ guests: [] }), ctx);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(svc.setGuestDates).not.toHaveBeenCalled();
  });

  it('responde 401 sin token', async () => {
    const response = await (POST as any)(makeRequest({ guests: [] }, false), ctx);
    expect(response.status).toBe(401);
    expect(svc.setGuestDates).not.toHaveBeenCalled();
  });
});
