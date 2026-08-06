
import { NextResponse, NextRequest } from 'next/server';
import { authService } from '../../../../services/authService';
import { authRateLimit } from '@/lib/auth-rate-limit';

export async function POST(request: NextRequest) {
  // No tenía ningún límite propio, y acepta un token por el cuerpo: es una
  // superficie de adivinación tan válida como el login.
  const rateLimitResponse = await authRateLimit(request);
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
