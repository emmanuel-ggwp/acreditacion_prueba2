// Prueba unitaria del handler de /api/reports/dashboard.
// Factory-mock del servicio (no cargar la cadena real de modelos → sequelize) y del
// verificador de JWT. withAuth consulta User.findByPk (mockeado globalmente en jest.setup).
jest.mock('@/services/reportService', () => ({
  reportService: { getDashboardStats: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { reportService } from '@/services/reportService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedReportService = reportService as unknown as { getDashboardStats: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (url: string, withToken = true) =>
  new Request(url, {
    method: 'GET',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

describe('GET /api/reports/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve stats globales cuando no se pasa eventId', async () => {
    const stats = { total: 10 };
    mockedReportService.getDashboardStats.mockResolvedValue(stats);

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/dashboard'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(stats);
    expect(mockedReportService.getDashboardStats).toHaveBeenCalledWith(undefined);
  });

  it('pasa el eventId (UUID) al servicio tal cual', async () => {
    mockedReportService.getDashboardStats.mockResolvedValue({ ok: true });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/dashboard?eventId=4d24189e-4100-4720-86df-72e235d748ec'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockedReportService.getDashboardStats).toHaveBeenCalledWith('4d24189e-4100-4720-86df-72e235d748ec');
  });

  it('pasa un UUID que empieza con dígito sin truncarlo (regresión: antes parseInt lo rompía)', async () => {
    mockedReportService.getDashboardStats.mockResolvedValue({ ok: true });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/dashboard?eventId=4d24189e-aaaa'), { params: {} });

    expect(res.status).toBe(200);
    // Antes: parseInt('4d24189e-aaaa', 10) === 4 → getDashboardStats(4) fallaba. Ahora va el string.
    expect(mockedReportService.getDashboardStats).toHaveBeenCalledWith('4d24189e-aaaa');
  });

  it('devuelve 500 si el servicio lanza', async () => {
    mockedReportService.getDashboardStats.mockRejectedValue(new Error('boom'));

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/dashboard'), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe('Error generating dashboard stats');
    expect(body.error).toBe('boom');
  });

  it('permite al rol GUARDIA (la ruta admite todos los roles)', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
    mockedReportService.getDashboardStats.mockResolvedValue({ ok: true });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/dashboard'), { params: {} });

    expect(res.status).toBe(200);
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/dashboard', false), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(mockedReportService.getDashboardStats).not.toHaveBeenCalled();
  });
});
