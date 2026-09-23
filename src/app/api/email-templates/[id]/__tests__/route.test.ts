// Factory-mock del servicio (evita cargar el servicio real → models → sequelize).
jest.mock('@/services/emailTemplateService', () => ({
  emailTemplateService: {
    list: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('@/lib/jwt');

import { PUT, DELETE } from '../route';
import { emailTemplateService } from '@/services/emailTemplateService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { z } from 'zod';

const svc = emailTemplateService as unknown as {
  update: jest.Mock;
  remove: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer x' };

// El handler hace `await params`, así que se pasa como Promise (la forma real de App Router).
const ctx = (id = 't1') => ({ params: Promise.resolve({ id }) });

const putReq = (body: unknown, headers: Record<string, string> = authHeaders) =>
  new Request('http://localhost/api/email-templates/t1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers,
  });

const delReq = (headers: Record<string, string> = authHeaders) =>
  new Request('http://localhost/api/email-templates/t1', { method: 'DELETE', headers });

describe('/api/email-templates/[id] route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'admin-1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'admin-1', isActive: true, role: 'ADMIN' });
  });

  describe('PUT', () => {
    const validBody = { subject: 'Nuevo asunto' };

    it('actualiza la plantilla y devuelve 200', async () => {
      const updated = { id: 't1', subject: 'Nuevo asunto' };
      svc.update.mockResolvedValue(updated);

      const res = await (PUT as any)(putReq(validBody), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(updated);
      expect(svc.update).toHaveBeenCalledWith('t1', expect.objectContaining({ subject: 'Nuevo asunto' }));
    });

    it('devuelve 400 cuando el servicio lanza un ZodError', async () => {
      svc.update.mockRejectedValue(
        new z.ZodError([{ code: 'custom', path: ['subject'], message: 'Inválido' } as any])
      );

      const res = await (PUT as any)(putReq({}), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validación fallida');
      expect(Array.isArray(body.errors)).toBe(true);
    });

    it('devuelve 500 cuando la plantilla no existe (error genérico)', async () => {
      svc.update.mockRejectedValue(new Error('Plantilla no encontrada'));

      const res = await (PUT as any)(putReq(validBody), ctx('nope'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'Plantilla no encontrada' });
    });

    it('devuelve 403 si el rol no es ADMIN', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'op-1', isActive: true, role: 'OPERATOR' });

      const res = await (PUT as any)(putReq(validBody), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.update).not.toHaveBeenCalled();
    });

    it('devuelve 401 si no hay token', async () => {
      const res = await (PUT as any)(putReq(validBody, { 'Content-Type': 'application/json' }), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
      expect(svc.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('elimina la plantilla y devuelve 200', async () => {
      svc.remove.mockResolvedValue({ message: 'Plantilla eliminada' });

      const res = await (DELETE as any)(delReq(), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ message: 'Plantilla eliminada' });
      expect(svc.remove).toHaveBeenCalledWith('t1');
    });

    it('devuelve 500 cuando la plantilla no existe', async () => {
      svc.remove.mockRejectedValue(new Error('Plantilla no encontrada'));

      const res = await (DELETE as any)(delReq(), ctx('nope'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'Plantilla no encontrada' });
    });

    it('devuelve 403 si el rol no es ADMIN', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'op-1', isActive: true, role: 'OPERATOR' });

      const res = await (DELETE as any)(delReq(), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('devuelve 401 si no hay token', async () => {
      const res = await (DELETE as any)(delReq({}), ctx('t1'));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
      expect(svc.remove).not.toHaveBeenCalled();
    });
  });
});
