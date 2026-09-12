import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/authService';
import { loginSchema } from '../../../../utils/validators/authSchemas';
import { ZodError } from 'zod';
import {
  authRateLimit,
  checkAccountRateLimit,
  penalizeAccountRateLimit,
  resetAccountRateLimit,
} from '@/lib/auth-rate-limit';
import { setRefreshCookie } from '@/lib/authCookie';

export async function POST(request: NextRequest) {
  // Límite por IP: holgado, para no dejar fuera a toda una sede tras el mismo NAT.
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Se rellena tras validar el cuerpo; el catch lo necesita para penalizar la
  // cuota (email, ip) cuando el intento falla.
  let email: string | undefined;

  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    email = validatedData.email;

    // Límite por credencial (email, ip): estricto, y es el que de verdad frena la
    // adivinación de una contraseña. Se COMPRUEBA aquí —antes de bcrypt, para no
    // regalar CPU con la cuota agotada— pero solo se CONSUME si el intento falla:
    // quien acierta la contraseña entra mientras quede al menos un punto (1-9
    // fallos previos); con la cuota AGOTADA este 429 llega antes de mirar la
    // contraseña (R2-01).
    const accountLimited = await checkAccountRateLimit(email, request);
    if (accountLimited) {
      return accountLimited;
    }

    const { refreshToken, ...publicResult } = await authService.login(validatedData);

    // Acertar devuelve la cuota de SU credencial; el cubo por IP se mantiene a
    // propósito, o bastaría una credencial válida para reiniciarlo a voluntad.
    await resetAccountRateLimit(email, request);

    // El refresh token (30 días) NO va en el cuerpo: se entrega en una cookie
    // HttpOnly que el JS de la página no puede leer (hallazgo #4 / F3-08). El
    // cuerpo lleva solo el user y el access token (corto), que el cliente sigue
    // enviando por la cabecera Authorization.
    const response = NextResponse.json({ success: true, data: publicResult });
    setRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Invalid credentials') {
      // El único sitio donde se gasta cuota: el intento FALLÓ contra una cuenta
      // concreta desde esta IP. Un error de validación o un 500 no penalizan.
      // (authService lanza 'Invalid credentials' tanto para contraseña incorrecta
      // como para cuenta desactivada — SB-28 — así que aquí ya no se distingue.)
      if (email) {
        await penalizeAccountRateLimit(email, request);
      }
      // Mensaje claro para el usuario y en español, idéntico en ambos casos.
      return NextResponse.json({ success: false, error: 'Credenciales inválidas' }, { status: 401 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}
