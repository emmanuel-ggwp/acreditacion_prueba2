import { RateLimiterPostgres, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import { NextRequest } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import { clientIdentifier, tooManyRequests } from '@/lib/rate-limit';

/**
 * Límites para las rutas de credenciales (F1-03).
 *
 * Son DOS cubos con propósitos distintos, y la separación no es cosmética: un solo
 * cubo por IP no puede proteger la contraseña sin castigar a usuarios legítimos.
 *
 * - **Por cuenta** (`account:<email>`): estricto. Es el que de verdad frena la
 *   adivinación de una contraseña, porque el atacante no puede cambiar de objetivo
 *   sin empezar de cero.
 * - **Por IP** (`auth:<ip>`): holgado. Frena el barrido de muchas cuentas desde un
 *   mismo origen. Es holgado a propósito: en un evento, todo el personal de
 *   acreditación comparte la IP pública de la sede, así que un umbral estrecho
 *   dejaría fuera a toda la puerta a la vez.
 *
 * El almacén es PostgreSQL: el contador sobrevive a un reinicio y se comparte entre
 * procesos. No hace falta infraestructura nueva —`RateLimiterPostgres` acepta la
 * instancia de Sequelize que ya existe y crea su tabla con `CREATE TABLE IF NOT
 * EXISTS`—. El limitador general de `middleware.ts` no puede usarlo porque Next
 * compila el middleware al runtime Edge, donde no hay base de datos.
 */

const ACCOUNT_POINTS = 10; // intentos contra UNA cuenta...
const ACCOUNT_DURATION = 900; // ...por cada 15 minutos
const ACCOUNT_BLOCK = 900;

// Por IP se cuentan las peticiones de credenciales de toda una sede compartiendo
// NAT. 60 en 15 minutos corta un barrido automatizado y no estorba al uso real.
const IP_POINTS = 60;
const IP_DURATION = 900;
const IP_BLOCK = 900;

/**
 * Si PostgreSQL no responde, el limitador degrada a memoria en vez de dejar pasar.
 * Verificado deteniendo el contenedor: el bloqueo se mantiene. Un fallo de base de
 * datos no puede convertirse en barra libre sobre el formulario de login.
 */
function insurance(keyPrefix: string, points: number, duration: number, blockDuration: number) {
  return new RateLimiterMemory({ keyPrefix: `${keyPrefix}_insurance`, points, duration, blockDuration });
}

const limiters = new Map<string, RateLimiterAbstract>();

/**
 * Construcción perezosa: el módulo se importa durante `next build`, y crear el
 * limitador al importarlo obligaría a tener PostgreSQL disponible para compilar.
 */
function getLimiter(
  keyPrefix: string,
  points: number,
  duration: number,
  blockDuration: number
): RateLimiterAbstract {
  const cached = limiters.get(keyPrefix);
  if (cached) return cached;

  const fallback = insurance(keyPrefix, points, duration, blockDuration);
  let limiter: RateLimiterAbstract = fallback;

  try {
    limiter = new RateLimiterPostgres(
      {
        storeClient: sequelize,
        storeType: 'sequelize',
        tableName: 'rate_limits',
        keyPrefix,
        points,
        duration,
        blockDuration,
        insuranceLimiter: fallback,
      },
      // El callback es obligatorio en la práctica: el constructor lanza el
      // CREATE TABLE de forma asíncrona y, sin él, un fallo se convierte en un
      // throw fuera de este try — una promesa rechazada sin manejar.
      (err) => {
        if (err) {
          console.error(`El limitador "${keyPrefix}" no pudo crear su tabla; degrada a memoria.`, err);
          limiters.set(keyPrefix, fallback);
        }
      }
    );
  } catch (e) {
    console.error(`No se pudo inicializar el limitador "${keyPrefix}" en PostgreSQL; se usa memoria.`, e);
  }

  limiters.set(keyPrefix, limiter);
  return limiter;
}

const ipLimiter = () => getLimiter('auth', IP_POINTS, IP_DURATION, IP_BLOCK);
const accountLimiter = () => getLimiter('account', ACCOUNT_POINTS, ACCOUNT_DURATION, ACCOUNT_BLOCK);

async function consume(limiter: RateLimiterAbstract, key: string) {
  try {
    await limiter.consume(key);
    return null;
  } catch (e) {
    // `consume` rechaza con un RateLimiterRes cuando se agota la cuota. Los fallos
    // del almacén NO llegan aquí: el insuranceLimiter los absorbe antes. Si alguno
    // se colara, se responde 429 igualmente — este límite falla CERRADO.
    return tooManyRequests(e);
  }
}

/**
 * Límite por IP. Se llama al principio del handler, antes de leer el cuerpo.
 */
export async function authRateLimit(request: NextRequest) {
  return consume(ipLimiter(), clientIdentifier(request));
}

/**
 * Límite por cuenta. Se llama DESPUÉS de validar el cuerpo, cuando ya se conoce a
 * qué usuario se intenta acceder.
 */
export async function accountRateLimit(email: string) {
  return consume(accountLimiter(), email.trim().toLowerCase());
}

/**
 * Devuelve la cuota de UNA CUENTA tras un login correcto: quien acierta no debe
 * gastar los intentos de su propia cuenta.
 *
 * Deliberadamente NO toca el cubo por IP. Borrarlo sería un agujero: bastaría con
 * poseer una credencial válida cualquiera para intercalar un acierto propio cada
 * pocos intentos y adivinar contra otras cuentas de forma indefinida.
 */
export async function resetAccountRateLimit(email: string) {
  try {
    await accountLimiter().delete(email.trim().toLowerCase());
  } catch {
    // Un fallo aquí solo significa que el usuario conserva el intento gastado.
  }
}
