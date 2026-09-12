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

/**
 * Construye la Content-Security-Policy con un nonce por petición (SB-03).
 *
 * script-src usa `'nonce-<n>' 'strict-dynamic'`: el navegador (CSP nivel 3)
 * ejecuta SOLO el script que lleva este nonce —los de arranque/hidratación que
 * Next.js marca automáticamente— y los que ESE cargue por propagación (los
 * chunks de la app). Con `strict-dynamic`, `'self'` y `'unsafe-inline'` quedan
 * IGNORADOS para scripts, así que un `<script>` que un XSS inyecte en el DOM sin
 * el nonce NO se ejecuta. Ese es el objetivo del hallazgo #4: que la CSP deje de
 * ser decorativa frente a XSS.
 *
 * `'unsafe-eval'` solo en desarrollo, donde Turbopack/react-refresh evalúan
 * código para el HMR; el bundle de producción no lo necesita.
 *
 * style-src conserva `'unsafe-inline'`: React aplica estilos en línea y librerías
 * como recharts/react-select inyectan `style="..."`; ponerles nonce a todos no es
 * viable y el XSS por estilos es de impacto muy inferior al de script.
 */
export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`;
  return [
    "default-src 'self'",
    "connect-src 'self' https://api.emailjs.com",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ') + ';';
}

/**
 * CORS en ejecución. Es lo ÚNICO que queda aquí porque es lo único dinámico: el
 * juego de orígenes depende de ALLOWED_ORIGIN, que se lee en cada arranque
 * (D8.2/SB-02), y el preflight OPTIONS necesita una respuesta propia. El resto de
 * cabeceras de seguridad ESTÁTICAS viven en next.config.js (fuente única, cubren
 * todas las rutas, incluida /api); la CSP la emite el middleware con el nonce.
 *
 * Solo se aplica a /api (lo decide el llamador en middleware.ts): CORS no tiene
 * sentido en las respuestas de página.
 */
export function corsMiddleware(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin') ?? '';
  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    setCorsHeaders(res, origin);
    return res;
  }
  setCorsHeaders(response, origin);
  return response;
}
