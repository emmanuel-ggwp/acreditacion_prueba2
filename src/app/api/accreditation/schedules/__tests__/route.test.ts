// Prueba unitaria del handler: se mockean los dos servicios y `@/lib/jwt`; `withAuth`
// contrasta el usuario contra User (mock global de jest.setup.js).
jest.mock('@/lib/jwt');
jest.mock('@/services/eventService', () => ({
  eventService: { refreshScheduleStatuses: jest.fn() },
}));
jest.mock('@/services/eventScheduleService', () => ({
  eventScheduleService: { getActiveSchedules: jest.fn() },
}));

import { GET } from '../route';
import { eventService } from '@/services/eventService';
import { eventScheduleService } from '@/services/eventScheduleService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedEventService = eventService as unknown as { refreshScheduleStatuses: jest.Mock };
const mockedScheduleService = eventScheduleService as unknown as { getActiveSchedules: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (withToken = true) =>
  new Request('http://localhost/api/accreditation/schedules', {
    headers: withToken ? { Authorization: 'Bearer x' } : {},
  });

describe('GET /api/accreditation/schedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
    mockedEventService.refreshScheduleStatuses.mockResolvedValue(undefined);
  });

  it('refresca estados y devuelve los horarios activos', async () => {
    const schedules = [{ id: 's1', status: 'ACCREDITATION' }];
    mockedScheduleService.getActiveSchedules.mockResolvedValue(schedules);

    const res = await (GET as any)(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(schedules);
    expect(mockedEventService.refreshScheduleStatuses).toHaveBeenCalledTimes(1);
    expect(mockedScheduleService.getActiveSchedules).toHaveBeenCalledTimes(1);
  });

  it('permite el rol GUARDIA (acreditador)', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });
    mockedScheduleService.getActiveSchedules.mockResolvedValue([]);

    const res = await (GET as any)(makeRequest());
    expect(res.status).toBe(200);
  });

  it('devuelve 500 cuando un servicio lanza', async () => {
    mockedScheduleService.getActiveSchedules.mockRejectedValue(new Error('no schedules'));

    const res = await (GET as any)(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'no schedules' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (GET as any)(makeRequest(false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(mockedEventService.refreshScheduleStatuses).not.toHaveBeenCalled();
  });
});
