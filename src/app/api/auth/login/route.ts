import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/authService';
import { loginSchema } from '../../../../utils/validators/authSchemas';
import { ZodError } from 'zod';
import { authRateLimit, accountRateLimit, resetAccountRateLimit } from '@/lib/auth-rate-limit';

export async function POST(request: NextRequest) {
  // Límite por IP: holgado, para no dejar fuera a toda una sede tras el mismo NAT.
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Límite por cuenta: estricto, y es el que de verdad frena la adivinación de
    // una contraseña. Se comprueba aquí porque hasta ahora no se sabía el email.
    const accountLimited = await accountRateLimit(validatedData.email);
    if (accountLimited) {
      return accountLimited;
    }

    const result = await authService.login(validatedData);

    // Acertar devuelve la cuota de SU cuenta; el cubo por IP se mantiene a
    // propósito, o bastaría una credencial válida para reiniciarlo a voluntad.
    await resetAccountRateLimit(validatedData.email);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Invalid credentials' || error.message === 'User account is disabled')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}
