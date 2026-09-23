// Premios de un evento. GET (ADMIN/MANAGER/OPERATOR/GUARDIA) lista; POST
// (ADMIN/MANAGER/OPERATOR) crea. eventId llega como Promise en el contexto.
jest.mock('@/services/awardService', () => ({
  awardService: { listAwardsByEvent: jest.fn(), createAward: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET, POST } from '../route';
import { awardService } from '@/services/awardService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = awardService as unknown as {
  listAwardsByEvent: jest.Mock;
  createAward: jest.Mock;
};

const VALID_GUID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (url: string, { method = 'GET', body, auth = true }: { method?: string; body?: any; auth?: boolean } = {}) =>
  new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer x' } : {}) },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/awards route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('lista los premios del evento', async () => {
      mocked.listAwardsByEvent.mockResolvedValue([{ id: 'a1' }]);

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1/awards'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual([{ id: 'a1' }]);
      expect(mocked.listAwardsByEvent).toHaveBeenCalledWith('e1');
    });

    it('responde 400 si el eventId es vacío', async () => {
      const res = await (GET as any)(makeRequest('http://localhost/api/events//awards'), ctx(''));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Invalid event ID' });
    });

    it('responde 500 si el servicio lanza', async () => {
      mocked.listAwardsByEvent.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1/awards'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('Error fetching awards');
    });
  });

  describe('POST', () => {
    it('crea un premio y responde 201', async () => {
      const created = { id: 'a1', name: 'Premio Test', quantity: 5 };
      mocked.createAward.mockResolvedValue(created);

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/awards', {
          method: 'POST',
          body: { eventId: VALID_GUID, name: 'Premio Test', quantity: 5 },
        }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mocked.createAward).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ name: 'Premio Test', quantity: 5 }),
        'u1'
      );
    });

    it('responde 400 ante datos inválidos', async () => {
      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/awards', { method: 'POST', body: { name: 'x' } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(mocked.createAward).not.toHaveBeenCalled();
    });

    it('responde 500 si el servicio lanza', async () => {
      mocked.createAward.mockRejectedValue(new Error('db'));

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/awards', {
          method: 'POST',
          body: { eventId: VALID_GUID, name: 'Premio Test', quantity: 5 },
        }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('Error creating award');
    });

    it('responde 401 sin token', async () => {
      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/awards', {
          method: 'POST',
          body: { eventId: VALID_GUID, name: 'Premio Test', quantity: 5 },
          auth: false,
        }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });

    it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/awards', {
          method: 'POST',
          body: { eventId: VALID_GUID, name: 'Premio Test', quantity: 5 },
        }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mocked.createAward).not.toHaveBeenCalled();
    });
  });
});
