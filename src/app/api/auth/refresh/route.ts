
import { NextResponse, NextRequest } from 'next/server';
import { authService } from '../../../../services/authService';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie } from '@/lib/authCookie';

export async function POST(request: NextRequest) {
  // Límite GENERAL, no el de credenciales. El cliente refresca solo, cerca de la
  // caducidad (authStore.ts) y ante cualquier 401 (apiClient.ts:52), así que
  // meterlo en el cubo estricto lo agotaría con tráfico legítimo: una sede con
  // varias pestañas abiertas se autobloquearía sin un solo intento de contraseña,
  // y el 429 encadena logout y deja el login bloqueado detrás.
  // El token de refresco no es adivinable por fuerza bruta como una contraseña.
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // El refresh token llega en la cookie HttpOnly (hallazgo #4 / F3-08), no en el
    // cuerpo: el cliente ya no lo tiene ni lo maneja.
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Refresh token is required' }, { status: 401 });
    }

    // authService rota el token: revoca el usado y emite uno nuevo. La cookie se
    // reescribe con el nuevo en CADA refresco, así la rotación es transparente al
    // cliente (antes el cliente ignoraba el token rotado y reutilizaba el viejo ya
    // revocado, lo que rompía el segundo refresco).
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(refreshToken);

    const response = NextResponse.json({ success: true, data: { accessToken } });
    setRefreshCookie(response, newRefreshToken);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      // Refresh inválido/revocado/expirado: además de 401, se borra la cookie para
      // no dejar al navegador reintentando con un token muerto.
      const response = NextResponse.json({ success: false, error: error.message }, { status: 401 });
      clearRefreshCookie(response);
      return response;
    }
    console.error('Refresh token error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}
