jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('@/services/ticketService', () => {
  const actual = jest.requireActual('@/services/ticketService');
  return { ...actual, ticketService: { getStatus: jest.fn(), deliver: jest.fn() } };
});

import { GET, POST } from '../route';
import { ticketService, TicketError } from '@/services/ticketService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const p = '123e4567-e89b-12d3-a456-426614174000';
const s = '123e4567-e89b-12d3-a456-426614174001';
const context = { params: Promise.resolve({ participantId: p }) };
const request = (body?: object) => new Request(`http://localhost/api/participants/${p}/tickets?scheduleId=${s}`, {
  method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

describe('API de tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
  });
  it('consulta estado sin modificar datos', async () => {
    (ticketService.getStatus as jest.Mock).mockResolvedValue({ maxPerParticipant: 5, delivery: null });
    const response = await (GET as any)(request(), context);
    expect(response.status).toBe(200);
    expect(ticketService.getStatus).toHaveBeenCalledWith(p, s);
    expect(ticketService.deliver).not.toHaveBeenCalled();
  });
  it('permite al acreditador registrar la entrega con su identidad autenticada', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', role: 'GUARDIA', isActive: true });
    (ticketService.deliver as jest.Mock).mockResolvedValue({ id: 't1', quantity: 3 });
    const response = await (POST as any)(request({ scheduleId: s, quantity: 3, deliveredBy: 'otro', participantId: 'otro' }), context);
    expect(response.status).toBe(201);
    expect(ticketService.deliver).toHaveBeenCalledWith(p, s, 3, 'u1');
  });
  it.each([0, -1, 1.5, '2', 10001])('rechaza cantidad inválida %s', async (quantity) => {
    const response = await (POST as any)(request({ scheduleId: s, quantity }), context);
    expect(response.status).toBe(400);
    expect(ticketService.deliver).not.toHaveBeenCalled();
  });
  it('rechaza IDs inválidos', async () => {
    const response = await (POST as any)(request({ scheduleId: 'no-es-id', quantity: 2 }), context);
    expect(response.status).toBe(400);
  });
  it('informa el conflicto cuando ya hubo entrega', async () => {
    (ticketService.deliver as jest.Mock).mockRejectedValue(new TicketError('Ya entregado', 409));
    const response = await (POST as any)(request({ scheduleId: s, quantity: 2 }), context);
    expect(response.status).toBe(409);
  });
  it('rechaza usuarios deshabilitados antes de consultar tickets', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: false });
    const response = await (GET as any)(request(), context);
    expect(response.status).toBe(403);
    expect(ticketService.getStatus).not.toHaveBeenCalled();
  });
});
