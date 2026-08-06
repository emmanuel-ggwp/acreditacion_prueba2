
import { NextResponse, NextRequest } from 'next/server';
import { authService } from '../../../../services/authService';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Límite GENERAL, no el de credenciales. El cliente refresca solo, cerca de la
  // caducidad (authStore.ts:132) y ante cualquier 401 (apiClient.ts:52), así que
  // meterlo en el cubo estricto lo agotaría con tráfico legítimo: una sede con
  // varias pestañas abiertas se autobloquearía sin un solo intento de contraseña,
  // y el 429 encadena logout y deja el login bloqueado detrás.
  // El token de refresco no es adivinable por fuerza bruta como una contraseña.
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Refresh token is required' }, { status: 400 });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    console.error('Refresh token error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}
