// Prueba unitaria del handler de /api/reports/events (reporte por lotes).
jest.mock('@/services/reportService', () => ({
  reportService: { getEventReport: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { reportService } from '@/services/reportService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedReportService = reportService as unknown as { getEventReport: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (url: string, withToken = true) =>
  new Request(url, {
    method: 'GET',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

describe('GET /api/reports/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('genera reportes para una lista `ids` separada por comas', async () => {
    mockedReportService.getEventReport.mockImplementation(async (id: string) => ({ total: Number(id) }));

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events?ids=1,2'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([
      { eventId: '1', total: 1 },
      { eventId: '2', total: 2 },
    ]);
    expect(mockedReportService.getEventReport).toHaveBeenCalledTimes(2);
  });

  it('acepta parámetros `id` repetidos', async () => {
    mockedReportService.getEventReport.mockResolvedValue({ ok: true });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events?id=1&id=2'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(mockedReportService.getEventReport).toHaveBeenCalledTimes(2);
  });

  it('filtra los reportes que fallan (un id que lanza se omite)', async () => {
    mockedReportService.getEventReport.mockImplementation(async (id: string) => {
      if (id === '2') throw new Error('no existe');
      return { ok: true };
    });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events?ids=1,2'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([{ eventId: '1', ok: true }]);
  });

  it('devuelve 400 si no se pasan ids', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'No event IDs provided' });
    expect(mockedReportService.getEventReport).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events?ids=1', false), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
