// Prueba unitaria del handler de /api/reports/events/[eventId].
// Roles permitidos: ADMIN, MANAGER, OPERATOR (no GUARDIA → sirve para el 403).
jest.mock('@/services/reportService', () => ({
  reportService: {
    getEventReport: jest.fn(),
    getGeneralReport: jest.fn(),
    getGuestsReport: jest.fn(),
    generateCsv: jest.fn(),
  },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { reportService } from '@/services/reportService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedReportService = reportService as unknown as {
  getEventReport: jest.Mock;
  getGeneralReport: jest.Mock;
  getGuestsReport: jest.Mock;
  generateCsv: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (url: string, withToken = true) =>
  new Request(url, {
    method: 'GET',
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

const ctx = (eventId: string) => ({ params: Promise.resolve({ eventId }) });

describe('GET /api/reports/events/[eventId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve el reporte JSON del evento por defecto (sin type)', async () => {
    mockedReportService.getEventReport.mockResolvedValue({ total: 3 });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/e1'), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ total: 3 });
    expect(mockedReportService.getEventReport).toHaveBeenCalledWith('e1');
  });

  it('type=general devuelve un CSV descargable', async () => {
    mockedReportService.getGeneralReport.mockResolvedValue([{ a: 1 }]);
    mockedReportService.generateCsv.mockResolvedValue('col\n1');

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/e1?type=general'), ctx('e1'));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('event_report_e1.csv');
    expect(text).toBe('col\n1');
    expect(mockedReportService.getGeneralReport).toHaveBeenCalledWith('e1');
  });

  it('type=guests devuelve un CSV de invitados', async () => {
    mockedReportService.getGuestsReport.mockResolvedValue([{ a: 1 }]);
    mockedReportService.generateCsv.mockResolvedValue('col\n1');

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/e1?type=guests'), ctx('e1'));
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain('event_guests_e1.csv');
    expect(text).toBe('col\n1');
    expect(mockedReportService.getGuestsReport).toHaveBeenCalledWith('e1');
  });

  it('devuelve 400 si el eventId viene vacío', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/'), ctx(''));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid event ID' });
  });

  it('devuelve 500 si el servicio lanza', async () => {
    mockedReportService.getEventReport.mockRejectedValue(new Error('db down'));

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/e1'), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe('Error generating event report');
    expect(body.error).toBe('db down');
  });

  it('devuelve 403 para el rol GUARDIA (no autorizado)', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/e1'), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mockedReportService.getEventReport).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/reports/events/e1', false), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
