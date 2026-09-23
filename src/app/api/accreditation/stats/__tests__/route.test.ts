// Prueba unitaria del handler: se mockea el servicio y `@/lib/jwt`; `withAuth`
// contrasta el usuario contra User (mock global de jest.setup.js).
jest.mock('@/lib/jwt');
jest.mock('@/services/accreditationService', () => ({
  accreditationService: { getScheduleStats: jest.fn() },
}));

import { GET } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = accreditationService as unknown as { getScheduleStats: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (url: string, withToken = true) =>
  new Request(url, { headers: withToken ? { Authorization: 'Bearer x' } : {} });

describe('GET /api/accreditation/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve las estadísticas del horario en éxito', async () => {
    const stats = { total: 100, accredited: 42, guests: 8 };
    mockedService.getScheduleStats.mockResolvedValue(stats);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/stats?scheduleId=sch1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(stats);
    expect(mockedService.getScheduleStats).toHaveBeenCalledWith('sch1');
  });

  it('permite el rol MANAGER', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'm1', isActive: true, role: 'MANAGER' });
    mockedService.getScheduleStats.mockResolvedValue({ total: 0 });

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/stats?scheduleId=sch1'));
    expect(res.status).toBe(200);
  });

  it('devuelve 400 cuando falta scheduleId', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/stats'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'scheduleId requerido' });
    expect(mockedService.getScheduleStats).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando el servicio lanza', async () => {
    mockedService.getScheduleStats.mockRejectedValue(new Error('fallo'));

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/stats?scheduleId=sch1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'fallo' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/stats?scheduleId=sch1', false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
