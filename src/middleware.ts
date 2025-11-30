import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from './middleware/security';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Create a response object to pass to the security middleware
  const response = NextResponse.next();

  // Apply security headers and CORS
  const securityResponse = await securityMiddleware(request, response);

  // If security middleware returns a response (e.g., for OPTIONS), use it
  if (securityResponse.status !== response.status) {
      return securityResponse;
  }

  // Continue with the request chain
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
