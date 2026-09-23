// POST (ADMIN/OPERATOR): importación masiva de participantes (filas mapeadas en el
// cliente). Usa el singleton participantService.importParticipants.
jest.mock('@/services/participantService', () => ({
  participantService: { importParticipants: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST } from '../route';
import { participantService } from '@/services/participantService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = participantService as unknown as { importParticipants: jest.Mock };

const makeRequest = (body?: any) =>
  new Request('http://localhost/api/events/e1/participants/import', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/participants/import route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('importa las filas y responde 200', async () => {
    mocked.importParticipants.mockResolvedValue({ created: 2, updated: 1 });

    const res = await (POST as any)(
      makeRequest({
        scheduleId: 's1',
        participants: [{ firstName: 'Ana' }, { firstName: 'Bob' }],
        overwriteNames: true,
        includeProtected: false,
      }),
      ctx('e1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ created: 2, updated: 1 });
    expect(mocked.importParticipants).toHaveBeenCalledWith(
      'e1',
      's1',
      [{ firstName: 'Ana' }, { firstName: 'Bob' }],
      'u1',
      { overwriteNames: true, includeProtected: false }
    );
  });

  it('usa scheduleId null cuando no se envía', async () => {
    mocked.importParticipants.mockResolvedValue({ created: 1 });

    await (POST as any)(
      makeRequest({ participants: [{ firstName: 'Ana' }] }),
      ctx('e1')
    );

    expect(mocked.importParticipants).toHaveBeenCalledWith(
      'e1',
      null,
      [{ firstName: 'Ana' }],
      'u1',
      { overwriteNames: false, includeProtected: false }
    );
  });

  it('responde 400 si no hay filas para importar', async () => {
    const res = await (POST as any)(makeRequest({ participants: [] }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('No hay filas para importar.');
    expect(mocked.importParticipants).not.toHaveBeenCalled();
  });

  it('responde 500 si el servicio lanza', async () => {
    mocked.importParticipants.mockRejectedValue(new Error('archivo corrupto'));

    const res = await (POST as any)(
      makeRequest({ participants: [{ firstName: 'Ana' }] }),
      ctx('e1')
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe('archivo corrupto');
  });

  it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (POST as any)(
      makeRequest({ participants: [{ firstName: 'Ana' }] }),
      ctx('e1')
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mocked.importParticipants).not.toHaveBeenCalled();
  });
});
