// Rutas de eventos (colección). POST crea (ADMIN/OPERATOR); GET lista eventos o,
// con ?mode=schedules, busca horarios (ADMIN/MANAGER/OPERATOR/GUARDIA).
//
// Se mockean los servicios (dependencias externas de la ruta) y el JWT. withAuth
// contrasta el rol contra la BD vía User.findByPk (mock global de jest.setup.js).
jest.mock('@/services/eventService', () => ({
  eventService: { createEvent: jest.fn(), getAllEvents: jest.fn() },
}));
jest.mock('@/services/eventScheduleService', () => ({
  eventScheduleService: { searchSchedules: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST, GET } from '../route';
import { eventService } from '@/services/eventService';
import { eventScheduleService } from '@/services/eventScheduleService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedEventService = eventService as unknown as {
  createEvent: jest.Mock;
  getAllEvents: jest.Mock;
};
const mockedScheduleService = eventScheduleService as unknown as { searchSchedules: jest.Mock };

const makeRequest = (
  url: string,
  { method = 'GET', body, auth = true }: { method?: string; body?: any; auth?: boolean } = {}
) =>
  new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/events route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('POST', () => {
    it('crea un evento y responde 201', async () => {
      const created = { id: 'e1', name: 'Evento Test', maxCapacity: 100 };
      mockedEventService.createEvent.mockResolvedValue(created);

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events', { method: 'POST', body: { name: 'Evento Test', maxCapacity: 100 } }),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mockedEventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Evento Test', maxCapacity: 100 }),
        'u1'
      );
    });

    it('responde 400 ante datos inválidos (ZodError)', async () => {
      const res = await (POST as any)(
        makeRequest('http://localhost/api/events', { method: 'POST', body: { name: 'ab' } }),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(mockedEventService.createEvent).not.toHaveBeenCalled();
    });

    it('responde 500 si el servicio lanza', async () => {
      mockedEventService.createEvent.mockRejectedValue(new Error('db down'));

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events', { method: 'POST', body: { name: 'Evento Test', maxCapacity: 100 } }),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('Error creating event');
      expect(body.error).toBe('db down');
    });

    it('responde 401 sin token', async () => {
      const res = await (POST as any)(
        makeRequest('http://localhost/api/events', { method: 'POST', body: { name: 'Evento Test', maxCapacity: 100 }, auth: false }),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });

    it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events', { method: 'POST', body: { name: 'Evento Test', maxCapacity: 100 } }),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedEventService.createEvent).not.toHaveBeenCalled();
    });
  });

  describe('GET', () => {
    it('lista los eventos con los filtros validados', async () => {
      const events = { events: [{ id: 'e1' }], total: 1 };
      mockedEventService.getAllEvents.mockResolvedValue(events);

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events?sortOrder=ASC'),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(events);
      expect(mockedEventService.getAllEvents).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 'ASC' })
      );
      expect(mockedScheduleService.searchSchedules).not.toHaveBeenCalled();
    });

    it('con ?mode=schedules delega en searchSchedules', async () => {
      mockedScheduleService.searchSchedules.mockResolvedValue([{ id: 's1' }]);

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events?mode=schedules&name=gala&from=2026-01-01&to=2026-02-01'),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ schedules: [{ id: 's1' }] });
      expect(mockedScheduleService.searchSchedules).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'gala' })
      );
      expect(mockedEventService.getAllEvents).not.toHaveBeenCalled();
    });

    it('responde 500 si el servicio lanza', async () => {
      mockedEventService.getAllEvents.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events'),
        { params: {} }
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('Error fetching events');
    });

    it('GUARDIA puede listar (rol permitido en GET)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
      mockedEventService.getAllEvents.mockResolvedValue({ events: [], total: 0 });

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events'),
        { params: {} }
      );

      expect(res.status).toBe(200);
      expect(mockedEventService.getAllEvents).toHaveBeenCalled();
    });
  });
});
