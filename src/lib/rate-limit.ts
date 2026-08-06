import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Límite general de la API (F1-03).
 *
 * Antes: `points: 1000, duration: 6`, es decir ~166 req/s por IP, mientras el
 * comentario del propio código anunciaba "10 requests / per 60 seconds". El
 * limitador no limitaba nada: 60 intentos de login fallidos seguidos no producían
 * un solo 429.
 *
 * 120 peticiones por minuto es holgado para el uso normal de la aplicación —la
 * pantalla de acreditación encadena varias llamadas por participante— y corta el
 * abuso automatizado. El límite estricto de credenciales vive aparte, en
 * `authRateLimiter`, porque 120/min sigue siendo mucho para un formulario de login.
 */
const rateLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
});

/**
 * Identidad del cliente a efectos de límite.
 *
 * `x-forwarded-for` es una cabecera que el cliente puede enviar: tomar el PRIMER
 * valor —lo que hacía este módulo— es tomar precisamente el que el atacante
 * controla, y basta rotarlo para evadir el límite por completo (verificado: 30
 * peticiones con IP rotada, cero 429).
 *
 * El ÚLTIMO valor es el que añade el proxy más cercano a la aplicación, y es el
 * único que el cliente no puede escribir. Funciona en las dos configuraciones
 * posibles de Nginx: si reescribe la cabecera hay un solo valor, y si la añade a
 * la cadena, el último sigue siendo el suyo.
 *
 * REQUISITO DE DESPLIEGUE: la aplicación debe escuchar solo en 127.0.0.1, con
 * Nginx como único camino de entrada (§7.4). Si el puerto queda expuesto a
 * Internet, cualquiera puede enviar la cabecera que quiera y ninguna heurística
 * de lectura lo arregla.
 */
export function clientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded.split(',').map((v) => v.trim()).filter(Boolean);
    if (chain.length > 0) return chain[chain.length - 1];
  }
  return request.headers.get('x-real-ip')?.trim() || '127.0.0.1';
}

function tooManyRequests(e: unknown): NextResponse {
  const msBeforeNext = (e as { msBeforeNext?: number })?.msBeforeNext ?? 60000;
  return new NextResponse('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil(msBeforeNext / 1000)) },
  });
}

export async function rateLimitMiddleware(request: NextRequest) {
  try {
    await rateLimiter.consume(clientIdentifier(request));
    return null;
  } catch (e) {
    return tooManyRequests(e);
  }
}

export { tooManyRequests };
