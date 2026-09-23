// Horario concreto. PUT (ADMIN/OPERATOR) edita; PATCH (ADMIN/OPERATOR/GUARDIA)
// abre/cierra acreditación o cambia imagen (GUARDIA restringido); DELETE
// (ADMIN/OPERATOR) borra. params = Promise<{ eventId, scheduleId }>.
jest.mock('@/services/eventScheduleService', () => ({
  eventScheduleService: {
    updateSchedule: jest.fn(),
    setImage: jest.fn(),
    setStatus: jest.fn(),
    deleteSchedule: jest.fn(),
  },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { PUT, PATCH, DELETE } from '../route';
import { eventScheduleService } from '@/services/eventScheduleService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mocked = eventScheduleService as unknown as {
  updateSchedule: jest.Mock;
  setImage: jest.Mock;
  setStatus: jest.Mock;
  deleteSchedule: jest.Mock;
};

const makeRequest = (url: string, { method = 'GET', body }: { method?: string; body?: any } = {}) =>
  new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (scheduleId = 's1', eventId = 'e1') => ({ params: Promise.resolve({ eventId, scheduleId }) });

const asAdmin = () => {
  (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
  (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
};
const asGuard = () => {
  (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'GUARDIA' });
  (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
};

const URL_BASE = 'http://localhost/api/events/e1/schedules/s1';

describe('/api/events/[eventId]/schedules/[scheduleId] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asAdmin();
  });

  describe('PUT', () => {
    it('actualiza el horario y responde 200', async () => {
      mocked.updateSchedule.mockResolvedValue({ id: 's1', scheduleName: 'Nuevo' });

      const res = await (PUT as any)(
        makeRequest(URL_BASE, { method: 'PUT', body: { scheduleName: 'Nuevo Nombre Horario' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ id: 's1', scheduleName: 'Nuevo' });
      expect(mocked.updateSchedule).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ scheduleName: 'Nuevo Nombre Horario' }),
        'u1'
      );
    });

    it('responde 400 si el scheduleId es vacío', async () => {
      const res = await (PUT as any)(
        makeRequest(URL_BASE, { method: 'PUT', body: { scheduleName: 'Nuevo Nombre' } }),
        ctx('')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Invalid schedule ID' });
    });

    it('responde 400 ante datos inválidos (ZodError)', async () => {
      const res = await (PUT as any)(
        makeRequest(URL_BASE, { method: 'PUT', body: { scheduleName: 'ab' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(mocked.updateSchedule).not.toHaveBeenCalled();
    });

    it('responde 400 con el mensaje del servicio ante error de negocio', async () => {
      mocked.updateSchedule.mockRejectedValue(new Error('capacidad excedida'));

      const res = await (PUT as any)(
        makeRequest(URL_BASE, { method: 'PUT', body: { scheduleName: 'Nuevo Nombre Horario' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('capacidad excedida');
    });
  });

  describe('PATCH', () => {
    it('cambia el estado del horario (setStatus)', async () => {
      mocked.setStatus.mockResolvedValue({ id: 's1', status: 'accrediting' });

      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: { status: 'accrediting' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ id: 's1', status: 'accrediting' });
      expect(mocked.setStatus).toHaveBeenCalledWith('s1', 'accrediting', 'u1');
    });

    it('cambia la imagen (setImage) para un ADMIN', async () => {
      mocked.setImage.mockResolvedValue({ id: 's1', imageUrl: 'http://img/x.png' });

      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: { imageUrl: 'http://img/x.png' } }),
        ctx('s1')
      );

      expect(res.status).toBe(200);
      expect(mocked.setImage).toHaveBeenCalledWith('s1', 'http://img/x.png', 'u1');
    });

    it('responde 400 si no hay nada que actualizar', async () => {
      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: {} }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Nada que actualizar' });
    });

    it('GUARDIA no puede cambiar la imagen (403)', async () => {
      asGuard();

      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: { imageUrl: 'http://img/x.png' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'No autorizado para cambiar la imagen del horario' });
      expect(mocked.setImage).not.toHaveBeenCalled();
    });

    it('GUARDIA no puede cambiar a un estado no permitido (403)', async () => {
      asGuard();

      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: { status: 'cancelled' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'No autorizado para cambiar a ese estado' });
      expect(mocked.setStatus).not.toHaveBeenCalled();
    });

    it('GUARDIA sí puede abrir/cerrar acreditación (estado permitido)', async () => {
      asGuard();
      mocked.setStatus.mockResolvedValue({ id: 's1', status: 'accrediting' });

      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: { status: 'accrediting' } }),
        ctx('s1')
      );

      expect(res.status).toBe(200);
      expect(mocked.setStatus).toHaveBeenCalledWith('s1', 'accrediting', 'u1');
    });

    it('responde 400 si el servicio lanza', async () => {
      mocked.setStatus.mockRejectedValue(new Error('transición inválida'));

      const res = await (PATCH as any)(
        makeRequest(URL_BASE, { method: 'PATCH', body: { status: 'accredited' } }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'transición inválida' });
    });
  });

  describe('DELETE', () => {
    it('borra el horario y responde 200', async () => {
      mocked.deleteSchedule.mockResolvedValue(undefined);

      const res = await (DELETE as any)(
        makeRequest(`${URL_BASE}?reason=duplicado`, { method: 'DELETE' }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ message: 'Schedule deleted successfully' });
      expect(mocked.deleteSchedule).toHaveBeenCalledWith('s1', 'u1', 'duplicado');
    });

    it('responde 400 si el scheduleId es vacío', async () => {
      const res = await (DELETE as any)(
        makeRequest(URL_BASE, { method: 'DELETE' }),
        ctx('')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Invalid schedule ID' });
    });

    it('responde 500 si el servicio lanza', async () => {
      mocked.deleteSchedule.mockRejectedValue(new Error('boom'));

      const res = await (DELETE as any)(
        makeRequest(URL_BASE, { method: 'DELETE' }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe('Error deleting schedule');
    });

    it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
      asGuard();

      const res = await (DELETE as any)(
        makeRequest(URL_BASE, { method: 'DELETE' }),
        ctx('s1')
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mocked.deleteSchedule).not.toHaveBeenCalled();
    });
  });
});
