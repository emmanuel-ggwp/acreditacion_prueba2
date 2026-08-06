import { RateLimiterPostgres, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import { NextRequest } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import { clientIdentifier, tooManyRequests } from '@/lib/rate-limit';

/**
 * Límite estricto para las rutas de credenciales (F1-03).
 *
 * Va aparte del limitador general por dos motivos:
 *
 * 1. **Umbral.** 120 req/min es holgado para navegar la aplicación y absurdo para
 *    un formulario de login: son 120 contraseñas por minuto y por IP.
 * 2. **Almacén.** Este vive en PostgreSQL, así que el contador sobrevive a un
 *    reinicio y se comparte entre procesos. El general no puede: se ejecuta desde
 *    `middleware.ts`, que Next compila para el runtime Edge —verificado en
 *    `.next/server/middleware-manifest.json`, entrada `server/edge/chunks`— donde
 *    no hay acceso a la base de datos. Los handlers de `app/api/**` sí corren en
 *    Node, y ahí es donde se aplica este.
 *
 * No hace falta infraestructura nueva: `RateLimiterPostgres` acepta la instancia
 * de Sequelize que la aplicación ya tiene y crea su propia tabla con
 * `CREATE TABLE IF NOT EXISTS`.
 */

const POINTS = 10; // intentos...
const DURATION = 900; // ...por cada 15 minutos
const BLOCK_DURATION = 900; // y 15 minutos de bloqueo al agotarlos

/**
 * Si PostgreSQL no responde, el limitador degrada a memoria en vez de dejar pasar
 * la petición. Es menos estricto que el almacén compartido, pero un fallo de base
 * de datos no debe convertirse en barra libre sobre el formulario de login.
 */
const insuranceLimiter = new RateLimiterMemory({
  keyPrefix: 'auth_insurance',
  points: POINTS,
  duration: DURATION,
  blockDuration: BLOCK_DURATION,
});

let limiter: RateLimiterAbstract | null = null;

/**
 * Construcción perezosa: el módulo se importa durante `next build`, y crear el
 * limitador al importarlo obligaría a tener PostgreSQL disponible para compilar.
 */
function getLimiter(): RateLimiterAbstract {
  if (limiter) return limiter;

  try {
    limiter = new RateLimiterPostgres(
      {
        storeClient: sequelize,
        storeType: 'sequelize',
        tableName: 'rate_limits',
        keyPrefix: 'auth',
        points: POINTS,
        duration: DURATION,
        blockDuration: BLOCK_DURATION,
        insuranceLimiter,
      },
      // El callback es obligatorio en la práctica: el constructor lanza el
      // CREATE TABLE de forma asíncrona y, sin él, un fallo se convierte en un
      // throw fuera de este try — una promesa rechazada sin manejar que tumba
      // el proceso. Con callback, el fallo se registra y queda el de memoria.
      (err) => {
        if (err) {
          console.error('El limitador no pudo crear su tabla; degrada a memoria.', err);
          limiter = insuranceLimiter;
        }
      }
    );
  } catch (e) {
    console.error('No se pudo inicializar el limitador en PostgreSQL; se usa memoria.', e);
    limiter = insuranceLimiter;
  }

  return limiter;
}

/**
 * Devuelve una respuesta 429 si la IP agotó sus intentos, o `null` si puede seguir.
 * Se llama al principio de cada handler de credenciales.
 */
export async function authRateLimit(request: NextRequest) {
  try {
    await getLimiter().consume(clientIdentifier(request));
    return null;
  } catch (e) {
    // `consume` rechaza tanto por límite agotado como por un fallo del almacén.
    // Un RateLimiterRes trae msBeforeNext; un error de verdad, no.
    if (e instanceof Error) {
      console.error('Fallo del limitador de autenticación:', e.message);
      return null;
    }
    return tooManyRequests(e);
  }
}

/**
 * Descuenta el intento consumido cuando el login fue correcto: quien acierta la
 * contraseña no debe gastar su cuota.
 */
export async function resetAuthRateLimit(request: NextRequest) {
  try {
    await getLimiter().delete(clientIdentifier(request));
  } catch {
    // Un fallo aquí solo significa que el usuario conserva el intento gastado.
  }
}
