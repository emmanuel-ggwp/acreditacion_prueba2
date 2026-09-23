jest.mock('@/services/giftService', () => ({
  giftService: {
    getCampaign: jest.fn(),
    listTypes: jest.fn(),
    summary: jest.fn(),
    updateCampaign: jest.fn(),
    deleteCampaign: jest.fn(),
  },
}));

jest.mock('@/lib/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { GET, PUT, DELETE } from '../route';
import { giftService } from '@/services/giftService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = giftService as unknown as {
  getCampaign: jest.Mock;
  listTypes: jest.Mock;
  summary: jest.Mock;
  updateCampaign: jest.Mock;
  deleteCampaign: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const ctx = { params: Promise.resolve({ id: 'c1' }) };

const makeRequest = (method: string, body?: any, withToken = true) =>
  new Request('http://localhost/api/gift-campaigns/c1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/gift-campaigns/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('GET', () => {
    it('devuelve campaña, tipos y resumen (200)', async () => {
      const campaign = { id: 'c1', name: 'Navidad' };
      const types = [{ id: 't1' }];
      const summary = { total: 5 };
      mockedService.getCampaign.mockResolvedValue(campaign);
      mockedService.listTypes.mockResolvedValue(types);
      mockedService.summary.mockResolvedValue(summary);

      const res = await (GET as any)(makeRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ campaign, types, summary });
      expect(mockedService.getCampaign).toHaveBeenCalledWith('c1');
      expect(mockedService.listTypes).toHaveBeenCalledWith('c1');
      expect(mockedService.summary).toHaveBeenCalledWith('c1');
    });

    it('404 si la campaña no existe', async () => {
      mockedService.getCampaign.mockResolvedValue(null);

      const res = await (GET as any)(makeRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({ message: 'Campaña no encontrada' });
      expect(mockedService.listTypes).not.toHaveBeenCalled();
    });

    it('500 si el servicio lanza', async () => {
      mockedService.getCampaign.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(makeRequest('GET'), ctx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });

    it('401 sin token', async () => {
      const res = await (GET as any)(makeRequest('GET', undefined, false), ctx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    });
  });

  describe('PUT', () => {
    it('actualiza la campaña (200)', async () => {
      const updated = { id: 'c1', name: 'Editada' };
      mockedService.updateCampaign.mockResolvedValue(updated);

      const res = await (PUT as any)(makeRequest('PUT', { name: 'Editada' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(updated);
      expect(mockedService.updateCampaign).toHaveBeenCalledWith('c1', { name: 'Editada' });
    });

    it('400 si el servicio lanza', async () => {
      mockedService.updateCampaign.mockRejectedValue(new Error('inválido'));

      const res = await (PUT as any)(makeRequest('PUT', { name: '' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'inválido' });
    });

    it('403 si el rol (BD) no está autorizado', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

      const res = await (PUT as any)(makeRequest('PUT', { name: 'X' }), ctx);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedService.updateCampaign).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('elimina la campaña (200)', async () => {
      mockedService.deleteCampaign.mockResolvedValue(undefined);

      const res = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(mockedService.deleteCampaign).toHaveBeenCalledWith('c1');
    });

    it('400 si el servicio lanza', async () => {
      mockedService.deleteCampaign.mockRejectedValue(new Error('no se puede'));

      const res = await (DELETE as any)(makeRequest('DELETE'), ctx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'no se puede' });
    });
  });
});
