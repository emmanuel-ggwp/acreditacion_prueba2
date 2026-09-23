// Rutas de un evento concreto. GET (ADMIN/OPERATOR) devuelve el evento o, con
// ?deletionSummary=true, el resumen de borrado en cascada. PUT (ADMIN/OPERATOR)
// actualiza. DELETE (solo ADMIN) borra. Los params son una Promise (el código hace
// `await params`).
jest.mock('@/services/eventService', () => ({
  eventService: {
    getEventById: jest.fn(),
    getDeletionSummary: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET, PUT, DELETE } from '../route';
import { eventService } from '@/services/eventService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = eventService as unknown as {
  getEventById: jest.Mock;
  getDeletionSummary: jest.Mock;
  updateEvent: jest.Mock;
  deleteEvent: jest.Mock;
};

const makeRequest = (url: string, { method = 'GET', body }: { method?: string; body?: any } = {}) =>
  new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('devuelve el evento por id', async () => {
      mocked.getEventById.mockResolvedValue({ id: 'e1', name: 'Evento' });

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ id: 'e1', name: 'Evento' });
      expect(mocked.getEventById).toHaveBeenCalledWith('e1', false);
    });

    it('con ?includeSchedules=true lo propaga al servicio', async () => {
      mocked.getEventById.mockResolvedValue({ id: 'e1' });

      await (GET as any)(makeRequest('http://localhost/api/events/e1?includeSchedules=true'), ctx('e1'));

      expect(mocked.getEventById).toHaveBeenCalledWith('e1', true);
    });

    it('con ?deletionSummary=true devuelve el resumen', async () => {
      mocked.getDeletionSummary.mockResolvedValue({ participants: 3 });

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1?deletionSummary=true'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ participants: 3 });
      expect(mocked.getDeletionSummary).toHaveBeenCalledWith('e1');
    });

    it('responde 400 si el id es vacío', async () => {
      const res = await (GET as any)(makeRequest('http://localhost/api/events/'), ctx(''));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Invalid event ID' });
    });

    it('responde 404 si el servicio lanza', async () => {
      mocked.getEventById.mockRejectedValue(new Error('Event not found'));

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'Event not found' });
    });
  });

  describe('PUT', () => {
    it('actualiza el evento y responde 200', async () => {
      mocked.updateEvent.mockResolvedValue({ id: 'e1', name: 'Nuevo' });

      const res = await (PUT as any)(
        makeRequest('http://localhost/api/events/e1', { method: 'PUT', body: { name: 'Nuevo Nombre' } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ id: 'e1', name: 'Nuevo' });
      expect(mocked.updateEvent).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ name: 'Nuevo Nombre' }),
        'u1'
      );
    });

    it('responde 400 ante datos inválidos', async () => {
      const res = await (PUT as any)(
        makeRequest('http://localhost/api/events/e1', { method: 'PUT', body: { maxCapacity: -5 } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(mocked.updateEvent).not.toHaveBeenCalled();
    });

    it('responde 500 si el servicio lanza', async () => {
      mocked.updateEvent.mockRejectedValue(new Error('boom'));

      const res = await (PUT as any)(
        makeRequest('http://localhost/api/events/e1', { method: 'PUT', body: { name: 'Nuevo Nombre' } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });
  });

  describe('DELETE', () => {
    it('borra el evento y responde 200', async () => {
      mocked.deleteEvent.mockResolvedValue(undefined);

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1?reason=limpieza', { method: 'DELETE' }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ message: 'Event deleted successfully' });
      expect(mocked.deleteEvent).toHaveBeenCalledWith('e1', 'u1', 'limpieza');
    });

    it('responde 403 si el rol de la BD no es ADMIN', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'OPERATOR' });

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1', { method: 'DELETE' }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mocked.deleteEvent).not.toHaveBeenCalled();
    });

    it('responde 500 si el servicio lanza', async () => {
      mocked.deleteEvent.mockRejectedValue(new Error('no se pudo'));

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1', { method: 'DELETE' }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'no se pudo' });
    });
  });
});
