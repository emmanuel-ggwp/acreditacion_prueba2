// Factory mock: evita cargar el authService real (y su cadena de modelos →
// sequelize), que no arranca sin base de datos en este entorno.
jest.mock('@/services/authService', () => ({
  authService: { logout: jest.fn() },
}));

import { POST } from '../route';
import { authService } from '@/services/authService';
import { NextRequest } from 'next/server';

const mockedAuthService = authService as unknown as { logout: jest.Mock };

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revoca el token de la cookie y borra la cookie', async () => {
    mockedAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { cookie: 'refreshToken=abc123' },
    });

    const response = await POST(request);

    expect(mockedAuthService.logout).toHaveBeenCalledWith('abc123');
    expect(response.status).toBe(200);

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('refreshToken=;');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('Path=/api/auth');
  });

  it('es idempotente sin cookie: no revoca nada y responde éxito', async () => {
    const request = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' });

    const response = await POST(request);
    const body = await response.json();

    expect(mockedAuthService.logout).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
