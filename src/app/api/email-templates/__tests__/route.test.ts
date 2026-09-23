// Factory-mock del servicio: el handler solo depende de esta forma. Evita cargar
// el servicio real (y con él models/index → sequelize), que no arranca sin BD.
jest.mock('@/services/emailTemplateService', () => ({
  emailTemplateService: {
    list: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));
// withAuth verifica el token con verifyAccessToken (se mockea) y luego contrasta
// vigencia + rol contra User.findByPk (mock global de jest.setup, se configura).
jest.mock('@/lib/jwt');

import { GET, POST } from '../route';
import { emailTemplateService } from '@/services/emailTemplateService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { z } from 'zod';

const svc = emailTemplateService as unknown as {
  list: jest.Mock;
  create: jest.Mock;
  getById: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer x' };

const getReq = (headers: Record<string, string> = authHeaders) =>
  new Request('http://localhost/api/email-templates', { method: 'GET', headers });

const postReq = (body: unknown, headers: Record<string, string> = authHeaders) =>
  new Request('http://localhost/api/email-templates', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });

describe('/api/email-templates route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'admin-1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'admin-1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('devuelve la lista de plantillas (200) para un ADMIN', async () => {
      const templates = [{ id: 't1', name: 'A' }, { id: 't2', name: 'B' }];
      svc.list.mockResolvedValue(templates);

      const res = await (GET as any)(getReq(), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(templates);
      expect(svc.list).toHaveBeenCalledTimes(1);
    });

    it('permite el rol OPERATOR (200)', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'op-1', isActive: true, role: 'OPERATOR' });
      svc.list.mockResolvedValue([]);

      const res = await (GET as any)(getReq(), { params: {} });

      expect(res.status).toBe(200);
      expect(svc.list).toHaveBeenCalledTimes(1);
    });

    it('devuelve 401 si no hay token', async () => {
      const res = await (GET as any)(getReq({ 'Content-Type': 'application/json' }), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
      expect(svc.list).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    const validBody = { name: 'Bienvenida', subject: 'Hola', body: '<p>Hi</p>' };

    it('crea una plantilla y devuelve 201', async () => {
      const created = { id: 't9', ...validBody };
      svc.create.mockResolvedValue(created);

      const res = await (POST as any)(postReq(validBody), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bienvenida' }));
    });

    it('devuelve 400 cuando el servicio lanza un ZodError', async () => {
      svc.create.mockRejectedValue(
        new z.ZodError([{ code: 'custom', path: ['name'], message: 'Requerido' } as any])
      );

      const res = await (POST as any)(postReq({}), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validación fallida');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it('devuelve 500 ante un error genérico del servicio', async () => {
      svc.create.mockRejectedValue(new Error('boom'));

      const res = await (POST as any)(postReq(validBody), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });

    it('devuelve 403 si el rol de la BD no es ADMIN', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'op-1', isActive: true, role: 'OPERATOR' });

      const res = await (POST as any)(postReq(validBody), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(svc.create).not.toHaveBeenCalled();
    });

    it('devuelve 401 si no hay token', async () => {
      const res = await (POST as any)(postReq(validBody, { 'Content-Type': 'application/json' }), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
      expect(svc.create).not.toHaveBeenCalled();
    });
  });
});
