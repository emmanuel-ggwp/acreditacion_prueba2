// Factory-mock del servicio: evita cargar giftService real (→ modelos → sequelize),
// que no arranca sin BD. Solo se declaran los métodos que usa esta ruta.
jest.mock('@/services/giftService', () => ({
  giftService: {
    listCampaigns: jest.fn(),
    createCampaign: jest.fn(),
  },
}));

// withAuth verifica el token con verifyAccessToken (@/lib/jwt) y luego contrasta la
// vigencia/ROL contra la BD (User.findByPk, ya mockeado globalmente en jest.setup.js).
jest.mock('@/lib/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { GET, POST } from '../route';
import { giftService } from '@/services/giftService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = giftService as unknown as {
  listCampaigns: jest.Mock;
  createCampaign: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-campaigns', {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/gift-campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('devuelve la lista de campañas (200)', async () => {
      const campaigns = [{ id: 'c1', name: 'Navidad' }];
      mockedService.listCampaigns.mockResolvedValue(campaigns);

      const res = await (GET as any)(makeRequest(), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(campaigns);
      expect(mockedService.listCampaigns).toHaveBeenCalledTimes(1);
    });

    it('401 si no se envía token', async () => {
      const res = await (GET as any)(makeRequest(undefined, false), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
      expect(mockedService.listCampaigns).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('crea una campaña (201)', async () => {
      const created = { id: 'c9', name: 'Nueva' };
      mockedService.createCampaign.mockResolvedValue(created);

      const res = await (POST as any)(makeRequest({ name: 'Nueva' }), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mockedService.createCampaign).toHaveBeenCalledWith('Nueva');
    });

    it('400 si falta el nombre', async () => {
      const res = await (POST as any)(makeRequest({}), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'El nombre es obligatorio' });
      expect(mockedService.createCampaign).not.toHaveBeenCalled();
    });

    it('500 si el servicio lanza un error', async () => {
      mockedService.createCampaign.mockRejectedValue(new Error('DB caída'));

      const res = await (POST as any)(makeRequest({ name: 'X' }), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'DB caída' });
    });

    it('403 si el rol (BD) no está autorizado para POST', async () => {
      // POST admite [ADMIN, OPERATOR, GUARDIA]; MANAGER queda fuera.
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const res = await (POST as any)(makeRequest({ name: 'X' }), { params: {} });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedService.createCampaign).not.toHaveBeenCalled();
    });
  });
});
