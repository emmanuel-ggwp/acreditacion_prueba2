// Horarios de un evento (colección). POST (ADMIN/OPERATOR) crea; GET
// (ADMIN/MANAGER/OPERATOR/GUARDIA) lista. eventId llega como Promise.
jest.mock('@/services/eventScheduleService', () => ({
  eventScheduleService: { createSchedule: jest.fn(), getSchedulesByEvent: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST, GET } from '../route';
import { eventScheduleService } from '@/services/eventScheduleService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = eventScheduleService as unknown as {
  createSchedule: jest.Mock;
  getSchedulesByEvent: jest.Mock;
};

const VALID_GUID = '11111111-1111-4111-8111-111111111111';
const validScheduleBody = {
  eventId: VALID_GUID,
  scheduleName: 'Horario Uno',
  startDateTime: '2026-01-01T10:00:00Z',
  endDateTime: '2026-01-01T12:00:00Z',
};

const makeRequest = (url: string, { method = 'GET', body }: { method?: string; body?: any } = {}) =>
  new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/schedules route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('POST', () => {
    it('crea un horario y responde 201', async () => {
      mocked.createSchedule.mockResolvedValue({ id: 's1', scheduleName: 'Horario Uno' });

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/schedules', { method: 'POST', body: validScheduleBody }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({ id: 's1', scheduleName: 'Horario Uno' });
      expect(mocked.createSchedule).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ scheduleName: 'Horario Uno' }),
        'u1'
      );
    });

    it('responde 400 ante datos inválidos (ZodError)', async () => {
      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/schedules', {
          method: 'POST',
          body: { ...validScheduleBody, scheduleName: 'ab' },
        }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(mocked.createSchedule).not.toHaveBeenCalled();
    });

    it('responde 400 con el mensaje del servicio ante error de negocio', async () => {
      mocked.createSchedule.mockRejectedValue(new Error('El evento no permite múltiples horarios'));

      const res = await (POST as any)(
        makeRequest('http://localhost/api/events/e1/schedules', { method: 'POST', body: validScheduleBody }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('El evento no permite múltiples horarios');
    });
  });

  describe('GET', () => {
    it('lista los horarios del evento', async () => {
      mocked.getSchedulesByEvent.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1/schedules'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual([{ id: 's1' }, { id: 's2' }]);
      expect(mocked.getSchedulesByEvent).toHaveBeenCalledWith('e1');
    });

    it('responde 500 si el servicio lanza', async () => {
      mocked.getSchedulesByEvent.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1/schedules'), ctx('e1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('Error fetching schedules');
    });

    it('GUARDIA puede listar (rol permitido en GET)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
      mocked.getSchedulesByEvent.mockResolvedValue([]);

      const res = await (GET as any)(makeRequest('http://localhost/api/events/e1/schedules'), ctx('e1'));

      expect(res.status).toBe(200);
      expect(mocked.getSchedulesByEvent).toHaveBeenCalled();
    });
  });
});
