// Ruta con withAuth. Factory-mock del servicio, verifyAccessToken y User.findByPk.
jest.mock('@/services/participantAwardService', () => ({
  participantAwardService: { assignAward: jest.fn() },
}));
jest.mock('@/lib/jwt');

import { POST } from '../route';
import { participantAwardService } from '@/services/participantAwardService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = participantAwardService as unknown as { assignAward: jest.Mock };
const verifyMock = verifyAccessToken as jest.Mock;
const UserMock = User as any;

const AWARD_ID = '33333333-3333-4333-a333-333333333333';
const PARTICIPANT_ID = '55555555-5555-4555-a555-555555555555';
const ASSIGNER = '44444444-4444-4444-a444-444444444444';

const validBody = (over: Record<string, unknown> = {}) => ({
  participantId: PARTICIPANT_ID,
  awardId: AWARD_ID,
  assignedBy: ASSIGNER,
  notes: 'entregado en puerta',
  ...over,
});

const authedRequest = (body?: any) =>
  new Request(`http://localhost/api/awards/${AWARD_ID}/assign`, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const noAuthRequest = () =>
  new Request(`http://localhost/api/awards/${AWARD_ID}/assign`, {
    method: 'POST',
    body: JSON.stringify(validBody()),
    headers: { 'Content-Type': 'application/json' },
  });

const ctx = (awardId = AWARD_ID) => ({ params: Promise.resolve({ awardId }) });

describe('POST /api/awards/[awardId]/assign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    verifyMock.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('asigna el premio (201) usando el awardId de la ruta y el usuario autenticado', async () => {
    const assignment = { id: 'pa1', participantId: PARTICIPANT_ID, awardId: AWARD_ID };
    svc.assignAward.mockResolvedValue(assignment);

    const res = await (POST as any)(authedRequest(validBody()), ctx());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(assignment);
    // (participantId, awardId de la ruta, assignedBy = req.user.id, notes)
    expect(svc.assignAward).toHaveBeenCalledWith(PARTICIPANT_ID, AWARD_ID, 'u1', 'entregado en puerta');
  });

  it('devuelve 400 si el awardId de la ruta está vacío', async () => {
    const res = await (POST as any)(authedRequest(validBody()), ctx(''));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid award ID' });
    expect(svc.assignAward).not.toHaveBeenCalled();
  });

  it('devuelve 400 con cuerpo inválido (falta participantId)', async () => {
    const res = await (POST as any)(authedRequest({ awardId: AWARD_ID, assignedBy: ASSIGNER }), ctx());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('Validation failed');
    expect(svc.assignAward).not.toHaveBeenCalled();
  });

  it('devuelve 401 sin token', async () => {
    const res = await (POST as any)(noAuthRequest(), ctx());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });

  it('devuelve 500 si el servicio lanza', async () => {
    svc.assignAward.mockRejectedValue(new Error('Award is out of stock.'));

    const res = await (POST as any)(authedRequest(validBody()), ctx());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'Error assigning award', error: 'Award is out of stock.' });
  });
});
