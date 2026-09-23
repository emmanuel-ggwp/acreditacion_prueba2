// Esta ruta NO usa el servicio: consulta los modelos directamente (Accreditation.count),
// que están mockeados globalmente en jest.setup.js. `withAuth` contrasta el usuario
// contra User (también mock global) y `@/lib/jwt` se mockea para el verify del token.
jest.mock('@/lib/jwt');

import { GET } from '../route';
import Accreditation from '@/models/Accreditation';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (url: string, withToken = true) =>
  new Request(url, { headers: withToken ? { Authorization: 'Bearer x' } : {} });

describe('GET /api/accreditations/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve el total y el total de hoy en éxito', async () => {
    (AccreditationMock.count as jest.Mock)
      .mockResolvedValueOnce(10) // totalAccreditations
      .mockResolvedValueOnce(3); // accreditationsToday

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditations/stats?eventId=e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ totalAccreditations: 10, accreditationsToday: 3 });
    expect(AccreditationMock.count).toHaveBeenCalledTimes(2);
  });

  it('permite el rol GUARDIA (acreditador)', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });
    (AccreditationMock.count as jest.Mock).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditations/stats?eventId=e1'));
    expect(res.status).toBe(200);
  });

  it('devuelve 400 cuando falta eventId', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditations/stats'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'eventId is required' });
    expect(AccreditationMock.count).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando la consulta a la BD lanza', async () => {
    (AccreditationMock.count as jest.Mock).mockRejectedValue(new Error('db fail'));

    const res = await (GET as any)(makeRequest('http://localhost/api/accreditations/stats?eventId=e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'db fail' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/accreditations/stats?eventId=e1', false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
