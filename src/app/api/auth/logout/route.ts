
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/authService';
import { REFRESH_COOKIE, clearRefreshCookie } from '@/lib/authCookie';

export async function POST(request: NextRequest) {
  try {
    // El refresh token llega en la cookie HttpOnly (hallazgo #4 / F3-08), no en el
    // cuerpo. Si viene, se revoca en BD; en cualquier caso se borra la cookie y se
    // responde éxito: cerrar sesión es idempotente (sin cookie no hay nada que
    // revocar, pero tampoco es un error).
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    clearRefreshCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Aun ante un fallo al revocar, se borra la cookie del navegador: el cliente
    // debe quedar deslogueado pase lo que pase en el servidor.
    const response = NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
    clearRefreshCookie(response);
    return response;
  }
}
