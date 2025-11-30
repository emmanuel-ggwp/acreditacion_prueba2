import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/authService';
import { loginSchema } from '../../../../utils/validators/authSchemas';
import { ZodError } from 'zod';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const result = await authService.login(validatedData);

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
