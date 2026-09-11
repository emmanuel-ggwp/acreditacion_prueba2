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

// 'unsafe-eval' solo en desarrollo (Next lo necesita para el HMR); en producción
// se retira (F6-03/SB-03). Esta CSP solo cubre /api (respuestas JSON, sin scripts):
// la que protege las páginas es la de next.config.js. Se mantiene en paralelo con
// aquella para que no diverjan.
const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://api.emailjs.com",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ') + ';';

export async function securityMiddleware(request: NextRequest, response: NextResponse) {
  // Set security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', CSP);
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
