// Prueba unitaria de GET/PUT/DELETE /api/participants/[participantId].
jest.mock('@/services/participantService', () => {
  const svc = {
    createParticipant: jest.fn(),
    getParticipant: jest.fn(),
    updateParticipant: jest.fn(),
    deleteParticipant: jest.fn(),
    revertToPreloaded: jest.fn(),
    setGuestDates: jest.fn(),
  };
  return {
    ParticipantService: jest.fn(() => svc),
    participantService: svc,
  };
});

jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET, PUT, DELETE } from '../route';
import { participantService } from '@/services/participantService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = participantService as unknown as {
  getParticipant: jest.Mock;
  updateParticipant: jest.Mock;
  deleteParticipant: jest.Mock;
};

const PID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (method: string, opts: { body?: any; query?: string; withToken?: boolean } = {}) => {
  const { body, query = '', withToken = true } = opts;
  return new Request(`http://localhost/api/participants/${PID}${query}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });
};

const ctx = { params: Promise.resolve({ participantId: PID }) };

describe('/api/participants/[participantId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('devuelve la ficha completa (guests + awards)', async () => {
      const participant = { id: PID, firstName: 'Ana' };
      svc.getParticipant.mockResolvedValue(participant);

      const response = await (GET as any)(makeRequest('GET'), ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(participant);
      expect(svc.getParticipant).toHaveBeenCalledWith(PID, true, true);
    });

    it('permite el rol MANAGER (lectura)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });
      svc.getParticipant.mockResolvedValue({ id: PID });

      const response = await (GET as any)(makeRequest('GET'), ctx);
      expect(response.status).toBe(200);
      expect(svc.getParticipant).toHaveBeenCalled();
    });

    it('propaga 404 del servicio', async () => {
      const err: any = new Error('Participante no encontrado');
      err.statusCode = 404;
      svc.getParticipant.mockRejectedValue(err);

      const response = await (GET as any)(makeRequest('GET'), ctx);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ message: 'Participante no encontrado' });
    });

    it('responde 401 sin token', async () => {
      const response = await (GET as any)(makeRequest('GET', { withToken: false }), ctx);
      expect(response.status).toBe(401);
      expect(svc.getParticipant).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    it('actualiza y responde 200', async () => {
      const updated = { id: PID, firstName: 'Nueva' };
      svc.updateParticipant.mockResolvedValue(updated);

      const response = await (PUT as any)(makeRequest('PUT', { body: { firstName: 'Nueva' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
      expect(svc.updateParticipant).toHaveBeenCalledWith(PID, { firstName: 'Nueva' }, 'u1');
    });

    it('responde 403 si el rol de la BD no puede escribir (MANAGER)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const response = await (PUT as any)(makeRequest('PUT', { body: { firstName: 'X' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.updateParticipant).not.toHaveBeenCalled();
    });

    it('propaga el error del servicio', async () => {
      const err: any = new Error('conflicto');
      err.statusCode = 409;
      svc.updateParticipant.mockRejectedValue(err);

      const response = await (PUT as any)(makeRequest('PUT', { body: {} }), ctx);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body).toEqual({ message: 'conflicto' });
    });
  });

  describe('DELETE', () => {
    it('elimina y pasa el motivo (reason) de la query', async () => {
      svc.deleteParticipant.mockResolvedValue({ success: true });

      const response = await (DELETE as any)(makeRequest('DELETE', { query: '?reason=duplicado' }), ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(svc.deleteParticipant).toHaveBeenCalledWith(PID, 'u1', 'duplicado');
    });

    it('pasa reason undefined cuando no viene en la query', async () => {
      svc.deleteParticipant.mockResolvedValue({ success: true });

      await (DELETE as any)(makeRequest('DELETE'), ctx);

      expect(svc.deleteParticipant).toHaveBeenCalledWith(PID, 'u1', undefined);
    });

    it('propaga el error del servicio', async () => {
      const err: any = new Error('no se pudo borrar');
      err.statusCode = 404;
      svc.deleteParticipant.mockRejectedValue(err);

      const response = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ message: 'no se pudo borrar' });
    });
  });
});
