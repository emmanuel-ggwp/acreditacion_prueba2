import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

/**
 * Cookie del refresh token (F3-08 / SB-... hallazgo #4).
 *
 * El refresh token (30 días) sale de localStorage y pasa a una cookie que el
 * JavaScript de la página NO puede leer (HttpOnly). Así un XSS deja de poder
 * robar la sesión de larga duración: el token de mayor impacto ya no está al
 * alcance del DOM. El access token (corto) sigue yendo por la cabecera
 * Authorization, que es lo que lee el rate-limit por usuario (rate-limit.ts) —eso
 * no cambia—.
 *
 * ATRIBUTOS y su porqué:
 * - HttpOnly: el objetivo. Invisible a document.cookie / JS.
 * - Secure (solo en producción): no viaja por HTTP en claro. En desarrollo se
 *   omite para que funcione sobre http://localhost sin depender de la excepción
 *   de "localhost es contexto seguro" de cada navegador.
 * - SameSite=Strict: la cookie NO se envía en peticiones de OTRO sitio. Esto es
 *   lo que mantiene INOFENSIVO el CORS reflejado (F2-04): mover la sesión a
 *   cookies "activa" ese riesgo (el navegador adjuntaría la credencial en
 *   peticiones cruzadas), pero con Strict la cookie simplemente no sale hacia un
 *   origen ajeno, así que no hay credencial ambiental que un tercero pueda
 *   aprovechar. Es también defensa CSRF. (En producción, además, ALLOWED_ORIGIN
 *   es obligatoria —env.ts— y el CORS ya no refleja orígenes arbitrarios.)
 * - Path=/api/auth: la cookie solo se envía a login/refresh/logout, que son los
 *   únicos que la necesitan; NO viaja en cada petición a /api/*. Menos exposición.
 * - Max-Age: se deriva del `exp` del propio token para que la cookie caduque a la
 *   vez que el refresh token.
 */
export const REFRESH_COOKIE = 'refreshToken';
const COOKIE_PATH = '/api/auth';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: COOKIE_PATH,
  };
}

/** Fija (o rota) la cookie del refresh token en la respuesta. */
export function setRefreshCookie(response: NextResponse, token: string): void {
  let maxAge: number | undefined;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (exp) maxAge = Math.max(0, exp - Math.floor(Date.now() / 1000));
  } catch {
    // Token sin `exp` legible: cookie de sesión (se borra al cerrar el navegador).
  }
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: token,
    ...baseCookieOptions(),
    ...(maxAge !== undefined ? { maxAge } : {}),
  });
}

/** Borra la cookie del refresh token (logout). */
export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: '',
    ...baseCookieOptions(),
    maxAge: 0,
  });
}
