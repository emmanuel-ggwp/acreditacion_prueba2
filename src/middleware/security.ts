import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : ['*'];

function setCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

export async function securityMiddleware(request: NextRequest, response: NextResponse) {
  // Set security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none';");
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  // CORS handling
  const origin = request.headers.get('origin') ?? '';
  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    setCorsHeaders(res, origin);
    return res;
  }

  setCorsHeaders(response, origin);

  return response;
}
