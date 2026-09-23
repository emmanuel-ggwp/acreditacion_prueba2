// Prueba unitaria del handler: se mockea el servicio y `@/lib/jwt`; `withAuth`
// contrasta el usuario contra User (mock global de jest.setup.js).
jest.mock('@/lib/jwt');
jest.mock('@/services/accreditationService', () => ({
  accreditationService: { getEventScheduleStats: jest.fn() },
}));

import { GET } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = accreditationService as unknown as { getEventScheduleStats: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (url: string, withToken = true) =>
  new Request(url, { headers: withToken ? { Authorization: 'Bearer x' } : {} });

describe('GET /api/accreditation/event-stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve el resumen por fecha del evento en éxito', async () => {
    const stats = { schedules: [{ scheduleId: 's1', total: 10 }], totals: { total: 10 } };
    mockedService.getEventScheduleStats.mockResolvedValue(stats);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/event-stats?eventId=e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(stats);
    expect(mockedService.getEventScheduleStats).toHaveBeenCalledWith('e1');
  });

  it('permite el rol GUARDIA (acreditador)', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });
    mockedService.getEventScheduleStats.mockResolvedValue({ totals: {} });

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/event-stats?eventId=e1'));
    expect(res.status).toBe(200);
  });

  it('devuelve 400 cuando falta eventId', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/event-stats'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'eventId requerido' });
    expect(mockedService.getEventScheduleStats).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando el servicio lanza', async () => {
    mockedService.getEventScheduleStats.mockRejectedValue(new Error('kaboom'));

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/event-stats?eventId=e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'kaboom' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/event-stats?eventId=e1', false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
