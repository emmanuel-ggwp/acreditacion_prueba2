import { NextResponse } from 'next/server';
import { authService } from '@/services/authService';
import { registerSchema } from '@/utils/validators/authSchemas';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ZodError } from 'zod';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

async function registerHandler(request: AuthenticatedRequest) {
  const rateLimitResult = await rateLimitMiddleware(request as any);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // The role is already checked by the withAuth middleware
    const creatorRole = request.user!.role;

    const newUser = await authService.register(validatedData, creatorRole);

    return NextResponse.json({ success: true, data: newUser, message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // Conflict for existing user
    }
    console.error('Register error:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}

// Protect the route and only allow ADMINs
export const POST = withAuth(registerHandler, [ADMIN]);
