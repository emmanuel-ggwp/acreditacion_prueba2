import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Límite general de la API (F1-03, recalibrado en R2-02).
 *
 * Historia: el original era `1000 puntos / 6 s` (~166 req/s), que no limitaba
 * nada. La remediación lo bajó a `120 / 60 s` por IP para TODO `/api/*`, pero ese
 * número se calibró a ojo y la aritmética real del producto lo desmiente:
 *
 *   Una acreditación dispara, medido sobre el flujo del navegador
 *   (AccreditationPanel → SearchParticipant → ParticipantCard →
 *   accreditationStore), S + 7 + 2N peticiones por persona, con S = búsquedas
 *   tras el debounce (1-3) y N = invitados con nombre:
 *     S × GET participants?search + 1 verify + [1 POST participante
 *     + N POST invitados + 1 GET última acreditación] + (1 + N) verify de
 *     recarga + 3 de refresco (stats, event-stats, schedules).
 *   Típico: 10-14 por persona. A 3 personas/min por puesto son ~42 req/min por
 *   operador: CUATRO puestos tras el NAT de una sede (~168 req/min) superaban
 *   los 120/min y la puerta empezaba a recibir 429 en plena hora punta. Y peor:
 *   `/api/auth/refresh` cuelga de este mismo cubo y `apiClient` hace logout si
 *   el refresh falla — el 429 se convertía en cierre de sesión masivo.
 *
 * El fallo de fondo no era solo el número: un límite POR IP trata a una sede
 * entera como si fuera un cliente. La corrección separa el tráfico en dos cubos
 * (D2.4):
 *
 * - **Autenticado** (token JWT VÁLIDO): cubo por USUARIO, no por IP. Así el
 *   número de puestos de la sede deja de importar: cada operador lleva su propia
 *   cuota. 600/min por usuario cubre incluso el caso degenerado de una sede
 *   entera trabajando con UNA cuenta compartida (6 puestos × ~42 req/min ≈
 *   252/min) con más del doble de margen, y sigue cortando a un script
 *   descontrolado con un token robado (10 req/s no es barra libre: el original
 *   "que no limitaba nada" era 166 req/s).
 * - **Anónimo** (sin token o token inválido): se mantiene el 120/min por IP.
 *   Aquí NO se relaja nada respecto a la remediación: el tráfico anónimo
 *   legítimo es login, refresh y las landings públicas — volumen mínimo — y el
 *   barrido automatizado sigue cortándose igual que antes.
 *
 * Entrar al cubo holgado exige la FIRMA del token, no su presencia: una cabecera
 * `Authorization` inventada se queda en el cubo anónimo. Verificar aquí es
 * barato (HMAC-SHA256, sin base de datos) y `jose` funciona en el runtime Edge
 * del middleware, donde `jsonwebtoken` no carga. Esto NO sustituye a `withAuth`:
 * el handler sigue verificando el token y el rol; aquí la firma solo decide en
 * qué cubo cae la petición.
 *
 * Los cubos viven en memoria (el runtime Edge no tiene base de datos) y los
 * límites de credenciales siguen aparte y mucho más estrictos en
 * `auth-rate-limit.ts`.
 */

// Anónimo: por IP. El valor de la remediación original, sin relajar (D2.4).
const ANON_POINTS = 120;
const ANON_DURATION = 60;

// Autenticado: por usuario. Dimensionado al caso peor razonable medido:
// 6 puestos × 3 personas/min × ~14 req/persona ≈ 252/min si TODA la sede
// comparte una sola cuenta; el doble largo deja margen para picos (D2.1).
const AUTH_POINTS = 600;
const AUTH_DURATION = 60;

const anonLimiter = new RateLimiterMemory({
  keyPrefix: 'general_anon',
  points: ANON_POINTS,
  duration: ANON_DURATION,
});

const authLimiter = new RateLimiterMemory({
  keyPrefix: 'general_auth',
  points: AUTH_POINTS,
  duration: AUTH_DURATION,
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

// La clave HMAC se materializa una sola vez. `undefined` = aún no mirado;
// `null` = no hay secreto (entonces TODO el tráfico cae al cubo anónimo:
// sin forma de verificar, se falla hacia el lado estricto).
let signingKey: Uint8Array | null | undefined;

function getSigningKey(): Uint8Array | null {
  if (signingKey === undefined) {
    const secret = process.env.JWT_SECRET;
    signingKey = secret ? new TextEncoder().encode(secret) : null;
  }
  return signingKey;
}

/**
 * Devuelve el id de usuario SOLO si la petición trae un access token con firma
 * válida y sin expirar. Cualquier otra cosa —sin cabecera, Bearer inventado,
 * token caducado, payload sin id— devuelve null y la petición se trata como
 * anónima. `jose` restringido a HS256, que es lo que firma `jwt.ts`
 * (jsonwebtoken con secreto simétrico): no se acepta ningún otro algoritmo.
 */
async function authenticatedUserId(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;

  const key = getSigningKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(header.slice(7), key, { algorithms: ['HS256'] });
    return typeof payload.id === 'string' && payload.id.length > 0 ? payload.id : null;
  } catch {
    return null;
  }
}

function tooManyRequests(e: unknown): NextResponse {
  const msBeforeNext = (e as { msBeforeNext?: number })?.msBeforeNext ?? 60000;
  return new NextResponse('Too many requests', {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil(msBeforeNext / 1000)) },
  });
}

export async function rateLimitMiddleware(request: NextRequest) {
  const userId = await authenticatedUserId(request);
  try {
    if (userId) {
      await authLimiter.consume(`user:${userId}`);
    } else {
      await anonLimiter.consume(clientIdentifier(request));
    }
    return null;
  } catch (e) {
    return tooManyRequests(e);
  }
}

export { tooManyRequests };
