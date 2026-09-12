import { NextRequest, NextResponse } from 'next/server';
import { buildCsp, corsMiddleware } from './middleware/security';
import { rateLimitMiddleware } from '@/lib/rate-limit';

/**
 * Nonce por petición para la CSP. Web Crypto está disponible en el runtime Edge
 * del middleware; 16 bytes aleatorios en base64 dan un nonce imposible de
 * adivinar por el atacante que intenta inyectar un <script>.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api');

  // Rate limit y CORS SOLO en /api. El middleware ahora corre también en las
  // páginas (para la CSP con nonce), pero los cubos de rate-limit.ts están
  // calibrados para peticiones de API: si contaran cada navegación, el uso
  // normal agotaría la cuota. CORS tampoco tiene sentido en respuestas de página.
  if (isApi) {
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    // Preflight: corsMiddleware devuelve su propio 204 (sin CSP, no la necesita).
    if (request.method === 'OPTIONS') {
      return corsMiddleware(request, NextResponse.next());
    }
  }

  // Nonce por petición (SB-03). Se propaga a Next por la cabecera de PETICIÓN
  // 'Content-Security-Policy': Next extrae el nonce y lo pone en los <script> que
  // él mismo emite (arranque, hidratación, carga de chunks). Esa lectura del
  // nonce hace que Next renderice la página dinámicamente, que es justo lo que
  // strict-dynamic necesita para que el nonce coincida en cada petición. x-nonce
  // queda disponible por si algún Server Component tuviera que leerlo.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // La CSP también en la RESPUESTA: es la que enforca el navegador.
  response.headers.set('Content-Security-Policy', csp);

  if (isApi) {
    corsMiddleware(request, response);
  }

  return response;
}

export const config = {
  // Todas las rutas MENOS lo interno de Next (/_next/*: chunks estáticos, imágenes
  // y —en desarrollo— el WebSocket del HMR, que un middleware sobre la petición
  // rompería) y los favicons. Quedan dentro las páginas (necesitan la CSP con
  // nonce) y /api (rate-limit + CORS). Los chunks de /_next/static los carga el
  // script de arranque, ya con nonce, y strict-dynamic les propaga la confianza:
  // no necesitan pasar por aquí. Se excluyen las peticiones de prefetch (RSC): no
  // deben arrastrar un nonce de un solo uso y no ejecutan scripts en línea. Todo
  // lo excluido sigue recibiendo las cabeceras de seguridad por next.config.js
  // (source '/:path*').
  matcher: [
    {
      source: '/((?!_next|favicon.ico|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
