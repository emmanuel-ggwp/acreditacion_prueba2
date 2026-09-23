// Prueba unitaria del handler: se mockea el servicio y `@/lib/jwt`; `withAuth`
// contrasta el usuario contra User (mock global). El cuerpo se valida con zod real
// (verifyAccreditationSchema), así que se usan GUIDs válidos.
jest.mock('@/lib/jwt');
jest.mock('@/services/accreditationService', () => ({
  accreditationService: { verifyAccreditation: jest.fn() },
}));

import { POST } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = accreditationService as unknown as { verifyAccreditation: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const GUID_A = '123e4567-e89b-12d3-a456-426614174000';
const GUID_B = '223e4567-e89b-12d3-a456-426614174001';

const makeRequest = (body: any, withToken = true) =>
  new Request('http://localhost/api/accreditations/verify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('POST /api/accreditations/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('verifica una acreditación y devuelve el resultado del servicio', async () => {
    const result = { status: 'accredited', name: 'Juan' };
    mockedService.verifyAccreditation.mockResolvedValue(result);

    const res = await (POST as any)(makeRequest({ type: 'participant', id: GUID_A, scheduleId: GUID_B }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(result);
    expect(mockedService.verifyAccreditation).toHaveBeenCalledWith('participant', GUID_A, GUID_B);
  });

  it('permite el rol GUARDIA (acreditador)', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });
    mockedService.verifyAccreditation.mockResolvedValue({ status: 'ok' });

    const res = await (POST as any)(makeRequest({ type: 'guest', id: GUID_A, scheduleId: GUID_B }));
    expect(res.status).toBe(200);
  });

  it('devuelve 400 con el detalle de errores cuando el cuerpo no pasa la validación zod', async () => {
    const res = await (POST as any)(makeRequest({ type: 'invalid', id: 'not-a-guid', scheduleId: GUID_B }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('Validation failed');
    // La ruta usa `error.issues` (zod v4): el 400 incluye el detalle de validación.
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(mockedService.verifyAccreditation).not.toHaveBeenCalled();
  });

  it('devuelve 500 cuando el servicio lanza', async () => {
    mockedService.verifyAccreditation.mockRejectedValue(new Error('no encontrado'));

    const res = await (POST as any)(makeRequest({ type: 'participant', id: GUID_A, scheduleId: GUID_B }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'Error verifying accreditation', error: 'no encontrado' });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (POST as any)(makeRequest({ type: 'participant', id: GUID_A, scheduleId: GUID_B }, false));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
