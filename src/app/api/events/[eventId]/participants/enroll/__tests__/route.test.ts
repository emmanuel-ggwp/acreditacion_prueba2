// POST (ADMIN/OPERATOR): inscripción masiva (suma fechas a participantes). Usa el
// singleton participantService.bulkEnrollParticipants.
jest.mock('@/services/participantService', () => ({
  participantService: { bulkEnrollParticipants: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST } from '../route';
import { participantService } from '@/services/participantService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = participantService as unknown as { bulkEnrollParticipants: jest.Mock };

const makeRequest = (body?: any) =>
  new Request('http://localhost/api/events/e1/participants/enroll', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/participants/enroll route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('inscribe participantes y responde 200', async () => {
    mocked.bulkEnrollParticipants.mockResolvedValue({ enrolled: 3 });

    const res = await (POST as any)(
      makeRequest({ participantIds: ['p1', 'p2', 'p3'], scheduleIds: ['s1'] }),
      ctx('e1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ enrolled: 3 });
    expect(mocked.bulkEnrollParticipants).toHaveBeenCalledWith(
      'e1',
      { participantIds: ['p1', 'p2', 'p3'], scheduleIds: ['s1'] },
      'u1'
    );
  });

  it('responde 400 si no hay participantes seleccionados', async () => {
    const res = await (POST as any)(makeRequest({ participantIds: [], scheduleIds: ['s1'] }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('No hay participantes seleccionados.');
    expect(mocked.bulkEnrollParticipants).not.toHaveBeenCalled();
  });

  it('responde 400 si no hay fechas seleccionadas', async () => {
    const res = await (POST as any)(makeRequest({ participantIds: ['p1'], scheduleIds: [] }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('Debes elegir al menos una fecha.');
    expect(mocked.bulkEnrollParticipants).not.toHaveBeenCalled();
  });

  it('responde 400 si el servicio lanza', async () => {
    mocked.bulkEnrollParticipants.mockRejectedValue(new Error('sin cupo'));

    const res = await (POST as any)(
      makeRequest({ participantIds: ['p1'], scheduleIds: ['s1'] }),
      ctx('e1')
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('sin cupo');
  });

  it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (POST as any)(
      makeRequest({ participantIds: ['p1'], scheduleIds: ['s1'] }),
      ctx('e1')
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mocked.bulkEnrollParticipants).not.toHaveBeenCalled();
  });
});
