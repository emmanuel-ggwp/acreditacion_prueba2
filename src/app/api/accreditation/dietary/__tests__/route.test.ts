// Prueba unitaria del handler: se mockea el servicio y `@/lib/jwt`; `withAuth`
// contrasta el usuario contra User (mock global de jest.setup.js).
jest.mock('@/lib/jwt');
jest.mock('@/services/accreditationService', () => ({
  accreditationService: { getDietaryList: jest.fn() },
}));

import { GET } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = accreditationService as unknown as { getDietaryList: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (url: string, withToken = true) =>
  new Request(url, { headers: withToken ? { Authorization: 'Bearer x' } : {} });

describe('GET /api/accreditation/dietary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve la lista de requerimientos alimentarios en éxito', async () => {
    const list = [{ id: 'p1', dietary: 'vegano', accredited: false }];
    mockedService.getDietaryList.mockResolvedValue(list);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/dietary?scheduleId=s9'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(list);
    expect(mockedService.getDietaryList).toHaveBeenCalledWith('s9');
  });

  it('permite el rol OPERATOR', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'o1', isActive: true, role: 'OPERATOR' });
    mockedService.getDietaryList.mockResolvedValue([]);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/dietary?scheduleId=s9'));
    expect(res.status).toBe(200);
  });

  it('devuelve 400 cuando falta scheduleId', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/dietary'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'scheduleId requerido' });
    expect(mockedService.getDietaryList).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando el servicio lanza', async () => {
    mockedService.getDietaryList.mockRejectedValue(new Error('db down'));

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/dietary?scheduleId=s9'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'db down' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditation/dietary?scheduleId=s9', false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
