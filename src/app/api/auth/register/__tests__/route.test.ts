import { POST } from '../route';
import { authService } from '@/services/authService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

jest.mock('@/services/authService');
jest.mock('@/lib/jwt');
// Factory: evita cargar el módulo real de rate-limit, que importa `jose` (ESM que Jest
// no transpila y que rompería la carga de la suite). En una prueba unitaria de la ruta
// el rate-limit es una dependencia externa que se neutraliza (siempre deja pasar).
jest.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: jest.fn().mockResolvedValue(null),
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedVerifyAccessToken = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const makeRequest = (body: any) =>
  new Request('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-token',
    },
  });

describe('POST /api/auth/register', () => {
  const validBody = {
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'Password123!',
    firstName: 'New',
    lastName: 'User',
    role: 'OPERATOR',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // withAuth verifica el token criptográficamente y luego contrasta la vigencia y el
    // ROL contra la BD (fuente de verdad). Por defecto, un ADMIN válido.
    mockedVerifyAccessToken.mockReturnValue({ id: 'admin-1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'admin-1', isActive: true, role: 'ADMIN' });
  });

  it('should register a user successfully as an ADMIN', async () => {
    const mockResponse = { id: '2', ...validBody };
    mockedAuthService.register.mockResolvedValue(mockResponse as any);

    const response = await (POST as any)(makeRequest(validBody), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockResponse);
    expect(mockedAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: validBody.email }),
      'ADMIN'
    );
  });

  it('should return 403 if the caller is not an ADMIN', async () => {
    // El rol autorizado es el de la BD, no el del token: aquí el usuario es OPERATOR.
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'op-1', isActive: true, role: 'OPERATOR' });

    const response = await (POST as any)(makeRequest(validBody), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(mockedAuthService.register).not.toHaveBeenCalled();
  });

  it('should return 401 if no token is provided', async () => {
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await (POST as any)(request, { params: {} });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });

  it('should return 409 if email is already in use', async () => {
    mockedAuthService.register.mockRejectedValue(new Error('Email already in use'));

    const response = await (POST as any)(makeRequest({ ...validBody, email: 'existing@example.com' }), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ success: false, error: 'Email already in use' });
  });

  it('should return 400 for invalid data', async () => {
    const response = await (POST as any)(makeRequest({ email: 'not-an-email' }), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(Array.isArray(body.error)).toBe(true);
    expect(body.error.length).toBeGreaterThan(0);
  });
});
