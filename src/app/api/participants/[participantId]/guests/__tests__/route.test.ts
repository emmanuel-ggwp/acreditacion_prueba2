// Prueba unitaria de GET/POST /api/participants/[participantId]/guests.
jest.mock('@/services/guestService', () => ({
  guestService: {
    listGuestsByParticipant: jest.fn(),
    addGuest: jest.fn(),
  },
}));

jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET, POST } from '../route';
import { guestService } from '@/services/guestService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = guestService as unknown as {
  listGuestsByParticipant: jest.Mock;
  addGuest: jest.Mock;
};

// participantId debe ser un GUID válido: createGuestSchema lo valida (z.guid()).
const PID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (method: string, opts: { body?: any; withToken?: boolean } = {}) => {
  const { body, withToken = true } = opts;
  return new Request(`http://localhost/api/participants/${PID}/guests`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });
};

const ctx = { params: Promise.resolve({ participantId: PID }) };

describe('/api/participants/[participantId]/guests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('lista los invitados del participante', async () => {
      const guests = [{ id: 'g1', firstName: 'Ana' }];
      svc.listGuestsByParticipant.mockResolvedValue(guests);

      const response = await (GET as any)(makeRequest('GET'), ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(guests);
      expect(svc.listGuestsByParticipant).toHaveBeenCalledWith(PID);
    });

    it('permite el rol MANAGER (lectura)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });
      svc.listGuestsByParticipant.mockResolvedValue([]);

      const response = await (GET as any)(makeRequest('GET'), ctx);
      expect(response.status).toBe(200);
    });

    it('responde 500 si el servicio falla', async () => {
      svc.listGuestsByParticipant.mockRejectedValue(new Error('boom'));

      const response = await (GET as any)(makeRequest('GET'), ctx);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'boom' });
    });
  });

  describe('POST', () => {
    it('crea un invitado válido y responde 201', async () => {
      const created = { id: 'g-new', firstName: 'Ana' };
      svc.addGuest.mockResolvedValue(created);

      const response = await (POST as any)(makeRequest('POST', { body: { firstName: 'Ana' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual(created);
      expect(svc.addGuest).toHaveBeenCalledWith(
        PID,
        expect.objectContaining({ firstName: 'Ana', participantId: PID, isAccredited: false }),
        'u1'
      );
      // El id se genera en el servidor (randomUUID), no viene del cliente.
      expect(svc.addGuest.mock.calls[0][1].id).toEqual(expect.any(String));
    });

    it('responde 400 (ZodError) si falta el nombre del invitado', async () => {
      const response = await (POST as any)(makeRequest('POST', { body: { lastName: 'Solo apellido' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(Array.isArray(body.error)).toBe(true);
      expect(body.error.length).toBeGreaterThan(0);
      expect(svc.addGuest).not.toHaveBeenCalled();
    });

    it('responde 500 si el servicio lanza un error no-Zod', async () => {
      svc.addGuest.mockRejectedValue(new Error('fallo interno'));

      const response = await (POST as any)(makeRequest('POST', { body: { firstName: 'Ana' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'fallo interno' });
    });

    it('responde 403 si el rol no puede escribir (MANAGER)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const response = await (POST as any)(makeRequest('POST', { body: { firstName: 'Ana' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.addGuest).not.toHaveBeenCalled();
    });

    it('responde 401 sin token', async () => {
      const response = await (POST as any)(makeRequest('POST', { body: { firstName: 'Ana' }, withToken: false }), ctx);
      expect(response.status).toBe(401);
      expect(svc.addGuest).not.toHaveBeenCalled();
    });
  });
});
