// Prueba unitaria del handler: se mockea el servicio (no se carga la cadena real de
// modelos/sequelize) y `@/lib/jwt`; `withAuth` contrasta el usuario contra User (mock global).
jest.mock('@/lib/jwt');
jest.mock('@/services/accreditationService', () => ({
  accreditationService: { getAwardedList: jest.fn() },
}));

import { GET } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = accreditationService as unknown as { getAwardedList: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (url: string, withToken = true) =>
  new Request(url, { headers: withToken ? { Authorization: 'Bearer x' } : {} });

describe('GET /api/accreditation/awarded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve la lista de premiados en éxito', async () => {
    const list = [{ id: 'p1', accredited: true }];
    mockedService.getAwardedList.mockResolvedValue(list);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/awarded?scheduleId=s1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(list);
    expect(mockedService.getAwardedList).toHaveBeenCalledWith('s1');
  });

  it('permite el rol GUARDIA (acreditador)', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });
    mockedService.getAwardedList.mockResolvedValue([]);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/awarded?scheduleId=s1'));
    expect(res.status).toBe(200);
  });

  it('devuelve 400 cuando falta scheduleId', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/awarded'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'scheduleId requerido' });
    expect(mockedService.getAwardedList).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando el servicio lanza', async () => {
    mockedService.getAwardedList.mockRejectedValue(new Error('boom'));

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/awarded?scheduleId=s1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'boom' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/awarded?scheduleId=s1', false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(mockedService.getAwardedList).not.toHaveBeenCalled();
  });
});
