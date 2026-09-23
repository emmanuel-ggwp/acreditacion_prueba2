// Prueba unitaria del handler de /api/reports/realtime/[eventId].
jest.mock('@/services/reportService', () => ({
  reportService: { getRealTimeStats: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { reportService } from '@/services/reportService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedReportService = reportService as unknown as { getRealTimeStats: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (url: string, withToken = true) =>
  new Request(url, {
    method: 'GET',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

const ctx = (eventId: string) => ({ params: Promise.resolve({ eventId }) });

describe('GET /api/reports/realtime/[eventId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve las stats en tiempo real del evento', async () => {
    const stats = { accredited: 5, pending: 2 };
    mockedReportService.getRealTimeStats.mockResolvedValue(stats);

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/realtime/e1'), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(stats);
    expect(mockedReportService.getRealTimeStats).toHaveBeenCalledWith('e1');
  });

  it('devuelve 400 si el eventId viene vacío', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/realtime/'), ctx(''));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid event ID' });
    expect(mockedReportService.getRealTimeStats).not.toHaveBeenCalled();
  });

  it('devuelve 500 con mensaje genérico (sin filtrar internals) si el servicio lanza', async () => {
    mockedReportService.getRealTimeStats.mockRejectedValue(new Error('secreto interno'));

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/realtime/e1'), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'Error generating real-time stats' });
    // El detalle del error NO debe filtrarse al cliente.
    expect(body.error).toBeUndefined();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/realtime/e1', false), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
