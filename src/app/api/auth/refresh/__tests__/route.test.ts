// Factory mock: evita cargar el authService real (y su cadena de modelos →
// sequelize), que no arranca sin base de datos en este entorno.
jest.mock('@/services/authService', () => ({
  authService: { refreshAccessToken: jest.fn() },
}));

// rate-limit importa `jose` (ESM) que este jest no transpila; se mockea a "pasa".
jest.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: jest.fn().mockResolvedValue(null),
}));

import { POST } from '../route';
import { authService } from '@/services/authService';
import { NextRequest } from 'next/server';

const mockedAuthService = authService as unknown as { refreshAccessToken: jest.Mock };

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lee el refresh token de la cookie, devuelve solo el access token y rota la cookie', async () => {
    mockedAuthService.refreshAccessToken.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { cookie: 'refreshToken=old-refresh-token' },
    });

    const response = await POST(request);
    const body = await response.json();

    // Se usa el token de la COOKIE, no del cuerpo.
    expect(mockedAuthService.refreshAccessToken).toHaveBeenCalledWith('old-refresh-token');
    expect(response.status).toBe(200);
    expect(body.data.accessToken).toBe('new-access-token');
    // El nuevo refresh token NO se filtra en el cuerpo.
    expect(body.data.refreshToken).toBeUndefined();

    // La cookie se reescribe con el token ROTADO (HttpOnly, Strict).
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('refreshToken=new-refresh-token');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toMatch(/SameSite=strict/i);
    expect(setCookie).toContain('Path=/api/auth');
  });

  it('responde 401 y no invoca el servicio si no hay cookie', async () => {
    const request = new NextRequest('http://localhost/api/auth/refresh', { method: 'POST' });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockedAuthService.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('ante un refresh token inválido responde 401 y borra la cookie', async () => {
    mockedAuthService.refreshAccessToken.mockRejectedValue(new Error('Invalid or revoked refresh token'));

    const request = new NextRequest('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { cookie: 'refreshToken=revoked' },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('refreshToken=;');
    expect(setCookie).toContain('Max-Age=0');
  });
});
