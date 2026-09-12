/**
 * Regresión de SB-29: dos `generateTokens` del mismo usuario en el mismo segundo
 * producían JWT idénticos (payload igual + `iat` con resolución de 1 s), y el
 * segundo `RefreshToken.create` chocaba con la unique del token → 500/401. Un
 * `jti` (UUID) único por token lo evita.
 */
describe('generateTokens — jti único (SB-29)', () => {
  const OLD_ENV = process.env;

  beforeAll(() => {
    process.env = {
      ...OLD_ENV,
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const payload = { id: 'u1', role: 'ADMIN', email: 'a@b.c', username: 'x' };

  it('dos generaciones seguidas del mismo usuario producen tokens distintos', () => {
    const { generateTokens } = require('@/lib/jwt');
    const a = generateTokens(payload);
    const b = generateTokens(payload);
    expect(a.refreshToken).not.toBe(b.refreshToken);
    expect(a.accessToken).not.toBe(b.accessToken);
  });

  it('cada token lleva un claim jti y sigue verificándose', () => {
    const jwt = require('jsonwebtoken');
    const { generateTokens, verifyRefreshToken, verifyAccessToken } = require('@/lib/jwt');
    const { accessToken, refreshToken } = generateTokens(payload);

    expect(jwt.decode(refreshToken).jti).toBeTruthy();
    expect(jwt.decode(accessToken).jti).toBeTruthy();
    expect(verifyRefreshToken(refreshToken)).not.toBeNull();
    expect(verifyAccessToken(accessToken)).not.toBeNull();
  });
});
