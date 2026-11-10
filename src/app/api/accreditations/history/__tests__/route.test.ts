jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('@/services/attendanceHistoryService', () => ({
  ...jest.requireActual('@/services/attendanceHistoryService'),
  attendanceHistoryService: { getHistory: jest.fn() },
}));

import { GET } from '../route';
import { attendanceHistoryService, AttendanceHistoryError } from '@/services/attendanceHistoryService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const id = '123e4567-e89b-12d3-a456-426614174000';
const scheduleId = '123e4567-e89b-12d3-a456-426614174001';
const request = (query = `type=participant&id=${id}&scheduleId=${scheduleId}`, token = true) => new Request(
  `http://localhost/api/accreditations/history?${query}`,
  { headers: token ? { Authorization: 'Bearer token' } : {} },
);

describe('GET /api/accreditations/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: true });
    (attendanceHistoryService.getHistory as jest.Mock).mockResolvedValue([]);
  });
  it.each(['ADMIN', 'MANAGER', 'OPERATOR', 'GUARDIA'])('permite consultar al rol %s', async (role) => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', role, isActive: true });
    const res = await (GET as any)(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ history: [] });
    expect(attendanceHistoryService.getHistory).toHaveBeenCalledWith('participant', id, scheduleId);
  });
  it('devuelve todas las asistencias sin convertirlas en un bloqueo', async () => {
    const history = [{ id: 'a1', scheduleName: 'Primera fecha' }, { id: 'a2', scheduleName: 'Segunda fecha' }];
    (attendanceHistoryService.getHistory as jest.Mock).mockResolvedValue(history);
    const res = await (GET as any)(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ history });
  });
  it('consulta a un invitado', async () => {
    await (GET as any)(request(`type=guest&id=${id}&scheduleId=${scheduleId}`));
    expect(attendanceHistoryService.getHistory).toHaveBeenCalledWith('guest', id, scheduleId);
  });
  it.each(['', 'type=otro&id=mal&scheduleId=mal'])('valida parámetros %s', async (query) => {
    const res = await (GET as any)(request(query));
    expect(res.status).toBe(400);
    expect(attendanceHistoryService.getHistory).not.toHaveBeenCalled();
  });
  it('rechaza una persona ajena o inexistente', async () => {
    (attendanceHistoryService.getHistory as jest.Mock).mockRejectedValue(new AttendanceHistoryError('No pertenece'));
    const res = await (GET as any)(request());
    expect(res.status).toBe(404);
  });
  it('requiere una sesión autenticada', async () => {
    const res = await (GET as any)(request(undefined, false));
    expect(res.status).toBe(401);
    expect(attendanceHistoryService.getHistory).not.toHaveBeenCalled();
  });
});
