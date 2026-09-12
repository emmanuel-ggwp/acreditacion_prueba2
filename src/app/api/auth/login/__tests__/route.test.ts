// Factory mock: evita cargar el authService real (y con él la cadena de modelos
// → sequelize), que en este entorno no arranca sin base de datos. Solo se
// necesita la forma de authService que usa este handler.
jest.mock('@/services/authService', () => ({
  authService: { login: jest.fn() },
}));

// El límite de credenciales se mockea: importa `jose` (ESM) vía rate-limit, que
// este jest no transpila, y aquí solo se prueba el handler, no el rate-limit.
jest.mock('@/lib/auth-rate-limit', () => ({
  authRateLimit: jest.fn().mockResolvedValue(null),
  checkAccountRateLimit: jest.fn().mockResolvedValue(null),
  penalizeAccountRateLimit: jest.fn().mockResolvedValue(undefined),
  resetAccountRateLimit: jest.fn().mockResolvedValue(undefined),
}));

import { POST } from '../route';
import { authService } from '@/services/authService';

const mockedAuthService = authService as unknown as { login: jest.Mock };

describe('POST /api/auth/login', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return tokens on successful login', async () => {
    const requestBody = { email: 'test@example.com', password: 'password123' };
    const mockResponse = {
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      user: { 
        id: '1', 
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN' as const 
      },
    };
    mockedAuthService.login.mockResolvedValue(mockResponse);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toEqual('fake-access-token');
    expect(body.data.user.email).toEqual('test@example.com');

    // El refresh token NO debe filtrarse en el cuerpo (hallazgo #4 / F3-08): va
    // en una cookie HttpOnly.
    expect(body.data.refreshToken).toBeUndefined();

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('refreshToken=fake-refresh-token');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toMatch(/SameSite=strict/i);
    expect(setCookie).toContain('Path=/api/auth');
  });

  it('should return 401 for invalid credentials', async () => {
    const requestBody = { email: 'wrong@example.com', password: 'wrongpassword' };
    mockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

    const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ success: false, error: 'Invalid credentials' });
  });

  it('should return 400 for invalid input', async () => {
    const requestBody = { email: 'not-an-email', password: 'short' }; // Invalid data
    
    const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.length).toBeGreaterThan(0);
  });
});
