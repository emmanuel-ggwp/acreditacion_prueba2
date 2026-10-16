// POST (ADMIN/OPERATOR): premiación masiva de participantes existentes (filas mapeadas
// en el cliente). Usa el singleton participantService.importAwards.
jest.mock('@/services/participantService', () => ({
  participantService: { importAwards: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST } from '../route';
import { participantService } from '@/services/participantService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = participantService as unknown as { importAwards: jest.Mock };

const makeRequest = (body?: any) =>
  new Request('http://localhost/api/events/e1/participants/award-import', {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/participants/award-import route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('premia las filas y responde 200 con el resultado del servicio', async () => {
    const result = { awarded: 1, alreadyAwarded: 0, reasonUpdated: 0, notFound: [{ row: 2, rut: '1-9' }], errors: [] };
    mocked.importAwards.mockResolvedValue(result);

    const rows = [{ documentNumber: '12345678-5', awardReason: 'Sorteo' }, { documentNumber: '1-9' }];
    const res = await (POST as any)(makeRequest({ participants: rows }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(mocked.importAwards).toHaveBeenCalledWith('e1', rows, 'u1');
  });

  it('responde 400 si no hay filas', async () => {
    const res = await (POST as any)(makeRequest({ participants: [] }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('No hay filas para premiar.');
    expect(mocked.importAwards).not.toHaveBeenCalled();
  });

  it('responde 400 si el body no trae participants', async () => {
    const res = await (POST as any)(makeRequest({}), ctx('e1'));
    expect(res.status).toBe(400);
    expect(mocked.importAwards).not.toHaveBeenCalled();
  });

  it('responde 500 si el servicio lanza', async () => {
    mocked.importAwards.mockRejectedValue(new Error('Event not found'));

    const res = await (POST as any)(makeRequest({ participants: [{ documentNumber: '12345678-5' }] }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe('Event not found');
  });

  it('permite OPERATOR', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'OPERATOR' });
    mocked.importAwards.mockResolvedValue({ awarded: 0, alreadyAwarded: 0, reasonUpdated: 0, notFound: [], errors: [] });

    const res = await (POST as any)(makeRequest({ participants: [{ email: 'a@b.cl' }] }), ctx('e1'));
    expect(res.status).toBe(200);
  });

  it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (POST as any)(makeRequest({ participants: [{ email: 'a@b.cl' }] }), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mocked.importAwards).not.toHaveBeenCalled();
  });
});
