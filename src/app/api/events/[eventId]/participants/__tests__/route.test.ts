// Padrón del evento. GET (ADMIN/MANAGER/OPERATOR/GUARDIA) lista o busca; DELETE
// (ADMIN/OPERATOR) elimina en masa. La ruta instancia `new ParticipantService()` en
// la carga del módulo y usa `request.nextUrl.searchParams`, por eso se usa
// NextRequest (aporta `nextUrl`).
//
// mock*: variables prefijadas con "mock" permitidas dentro de la fábrica de jest.mock.
const mockSearchParticipants = jest.fn();
const mockListParticipants = jest.fn();
const mockBulkDeleteParticipants = jest.fn();
jest.mock('@/services/participantService', () => ({
  ParticipantService: jest.fn().mockImplementation(() => ({
    searchParticipants: mockSearchParticipants,
    listParticipants: mockListParticipants,
    bulkDeleteParticipants: mockBulkDeleteParticipants,
  })),
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const makeRequest = (url: string, { method = 'GET', body }: { method?: string; body?: any } = {}) =>
  new NextRequest(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/participants route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('lista participantes con filtros y paginación', async () => {
      mockListParticipants.mockResolvedValue({ participants: [{ id: 'p1' }], total: 1, page: 2, limit: 5 });

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events/e1/participants?page=2&limit=5&accredited=true'),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total).toBe(1);
      expect(mockListParticipants).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ accredited: true }),
        { page: 2, limit: 5 }
      );
      expect(mockSearchParticipants).not.toHaveBeenCalled();
    });

    it('con ?search delega en searchParticipants', async () => {
      mockSearchParticipants.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events/e1/participants?search=ana&scheduleId=s1'),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ participants: [{ id: 'p1' }, { id: 'p2' }], total: 2, page: 1, limit: 2 });
      expect(mockSearchParticipants).toHaveBeenCalledWith('e1', 'ana', 's1');
      expect(mockListParticipants).not.toHaveBeenCalled();
    });

    it('usa error.statusCode cuando el servicio lo aporta', async () => {
      const err: any = new Error('no encontrado');
      err.statusCode = 404;
      mockListParticipants.mockRejectedValue(err);

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events/e1/participants'),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe('no encontrado');
    });

    it('responde 500 ante un error sin statusCode', async () => {
      mockListParticipants.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(
        makeRequest('http://localhost/api/events/e1/participants'),
        ctx('e1')
      );

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('elimina por ids y responde 200', async () => {
      mockBulkDeleteParticipants.mockResolvedValue({ deleted: 2 });

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1/participants', { method: 'DELETE', body: { ids: ['p1', 'p2'] } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ deleted: 2 });
      expect(mockBulkDeleteParticipants).toHaveBeenCalledWith('e1', { ids: ['p1', 'p2'], all: false }, 'u1');
    });

    it('elimina todos con all=true', async () => {
      mockBulkDeleteParticipants.mockResolvedValue({ deleted: 10 });

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1/participants', { method: 'DELETE', body: { all: true } }),
        ctx('e1')
      );

      expect(res.status).toBe(200);
      expect(mockBulkDeleteParticipants).toHaveBeenCalledWith('e1', { ids: undefined, all: true }, 'u1');
    });

    it('responde 400 si no hay ids ni all', async () => {
      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1/participants', { method: 'DELETE', body: {} }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Indica ids a eliminar o all=true para vaciar.');
      expect(mockBulkDeleteParticipants).not.toHaveBeenCalled();
    });

    it('responde 400 si el servicio lanza', async () => {
      mockBulkDeleteParticipants.mockRejectedValue(new Error('conflicto'));

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1/participants', { method: 'DELETE', body: { all: true } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('conflicto');
    });

    it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

      const res = await (DELETE as any)(
        makeRequest('http://localhost/api/events/e1/participants', { method: 'DELETE', body: { all: true } }),
        ctx('e1')
      );
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockBulkDeleteParticipants).not.toHaveBeenCalled();
    });
  });
});
