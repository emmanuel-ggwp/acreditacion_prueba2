// Prueba unitaria de PUT/DELETE /api/guests/[guestId].
jest.mock('@/services/guestService', () => ({
  guestService: {
    updateGuest: jest.fn(),
    deleteGuest: jest.fn(),
  },
}));

jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { PUT, DELETE } from '../route';
import { guestService } from '@/services/guestService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = guestService as unknown as {
  updateGuest: jest.Mock;
  deleteGuest: jest.Mock;
};

const GID = '22222222-2222-4222-8222-222222222222';

const makeRequest = (method: string, opts: { body?: any; query?: string; withToken?: boolean } = {}) => {
  const { body, query = '', withToken = true } = opts;
  return new Request(`http://localhost/api/guests/${GID}${query}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });
};

const ctx = { params: Promise.resolve({ guestId: GID }) };

describe('/api/guests/[guestId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('PUT', () => {
    it('actualiza el invitado y responde 200', async () => {
      const updated = { id: GID, firstName: 'Nueva' };
      svc.updateGuest.mockResolvedValue(updated);

      const response = await (PUT as any)(makeRequest('PUT', { body: { firstName: 'Nueva' } }), ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(updated);
      expect(svc.updateGuest).toHaveBeenCalledWith(GID, { firstName: 'Nueva' }, 'u1');
    });

    it('responde 500 si el servicio falla', async () => {
      svc.updateGuest.mockRejectedValue(new Error('no existe'));

      const response = await (PUT as any)(makeRequest('PUT', { body: {} }), ctx);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'no existe' });
    });

    it('responde 403 si el rol no puede escribir (MANAGER)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const response = await (PUT as any)(makeRequest('PUT', { body: {} }), ctx);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.updateGuest).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('elimina y pasa el motivo (reason) de la query', async () => {
      svc.deleteGuest.mockResolvedValue(undefined);

      const response = await (DELETE as any)(makeRequest('DELETE', { query: '?reason=error' }), ctx);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ message: 'Guest deleted successfully' });
      expect(svc.deleteGuest).toHaveBeenCalledWith(GID, 'u1', 'error');
    });

    it('pasa reason undefined cuando no viene en la query', async () => {
      svc.deleteGuest.mockResolvedValue(undefined);

      await (DELETE as any)(makeRequest('DELETE'), ctx);

      expect(svc.deleteGuest).toHaveBeenCalledWith(GID, 'u1', undefined);
    });

    it('responde 500 si el servicio falla', async () => {
      svc.deleteGuest.mockRejectedValue(new Error('fallo'));

      const response = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'fallo' });
    });

    it('responde 401 sin token', async () => {
      const response = await (DELETE as any)(makeRequest('DELETE', { withToken: false }), ctx);
      expect(response.status).toBe(401);
      expect(svc.deleteGuest).not.toHaveBeenCalled();
    });
  });
});
