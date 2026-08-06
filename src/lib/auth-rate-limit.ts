import { RateLimiterPostgres, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import { clientIdentifier, tooManyRequests } from '@/lib/rate-limit';
import { normalizeEmail } from '@/utils/email';

/**
 * Límites para las rutas de credenciales (F1-03, rediseñado en R2-01).
 *
 * Son DOS cubos con propósitos distintos, y la separación no es cosmética: un solo
 * cubo por IP no puede proteger la contraseña sin castigar a usuarios legítimos.
 *
 * - **Por credencial** (`account:<email>::<ip>`): estricto. Es el que de verdad
 *   frena la adivinación de una contraseña. La clave INCLUYE LA IP porque una clave
 *   que solo contiene el email es un valor que elige el atacante: once peticiones
 *   con el email de la víctima bloqueaban su cuenta 15 minutos, renovables para
 *   siempre — un DoS no autenticado contra personas concretas. Con `(email, ip)`
 *   quien ataca se bloquea a sí mismo desde su origen, no a la víctima desde el
 *   suyo. **Trade-off aceptado (D2.2):** un atacante con muchas IPs recupera
 *   intentos por IP; es el compromiso estándar y exige una botnet, mientras que el
 *   DoS de cuenta lo ejecutaba cualquiera con `curl`.
 * - **Por IP** (`auth:<ip>`): holgado. Frena el barrido de muchas cuentas desde un
 *   mismo origen. Es holgado a propósito: en un evento, todo el personal de
 *   acreditación comparte la IP pública de la sede, así que un umbral estrecho
 *   dejaría fuera a toda la puerta a la vez.
 *
 * Además, la cuota por credencial **solo se consume cuando el intento FALLA**
 * (D2.3): se comprueba con `get()` antes de verificar la contraseña —para no gastar
 * CPU en bcrypt cuando ya está agotada— y se consume después, únicamente en el
 * camino de fallo. Quien acierta la contraseña entra aunque lleve cuota gastada
 * (de 1 a 9 fallos previos); con la cuota AGOTADA la comprobación previa responde
 * 429 sin mirar la contraseña. Eso elimina el bloqueo del usuario legítimo en el
 * caso real (fallos sueltos por dedos torpes) sin regalar bcrypt a quien ya agotó
 * los 10 intentos.
 *
 * El almacén es PostgreSQL: el contador sobrevive a un reinicio y se comparte entre
 * procesos. No hace falta infraestructura nueva —`RateLimiterPostgres` acepta la
 * instancia de Sequelize que ya existe—. La tabla `rate_limits` la crea el
 * aprovisionamiento (`db:sync`, y en producción el plan 08/D8.4); este módulo solo
 * la crea como cortesía si falta en un entorno de desarrollo. El limitador general
 * de `middleware.ts` no puede usarlo porque Next compila el middleware al runtime
 * Edge, donde no hay base de datos.
 */

const ACCOUNT_POINTS = 10; // intentos FALLIDOS contra una cuenta desde una IP...
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

/**
 * La degradación a memoria era PERMANENTE (R2-03b): si el arranque pillaba a
 * PostgreSQL caído —o al usuario de aplicación sin `CREATE` en `public`, que es
 * lo normal en la base administrada de DigitalOcean con PostgreSQL 15+— el
 * callback del constructor fijaba el limitador de memoria para toda la vida del
 * proceso y el contador dejaba de compartirse y de sobrevivir a reinicios, sin
 * más aviso que un console.error. Ahora la conexión se reintenta cada RETRY_MS
 * hasta conseguirse, y la recuperación se registra igual que la degradación.
 */
const RETRY_MS = 30_000;

type LimiterState = {
  /** El limitador que atiende las peticiones AHORA: PostgreSQL o el de memoria. */
  active: RateLimiterAbstract;
  /**
   * Seguro de memoria ÚNICO por prefijo: sobrevive a los reintentos para que
   * los contadores acumulados durante una degradación no se pierdan en cada
   * intento de reconexión fallido.
   */
  fallback: RateLimiterMemory;
  /** `null` = conectado a PostgreSQL; timestamp = degradado, no reintentar antes. */
  retryAt: number | null;
  /** Momento en que empezó la degradación en curso, para poder registrar la vuelta. */
  degradedSince: number | null;
  /** Evita solapar dos intentos de conexión si uno tarda más que RETRY_MS. */
  connecting: boolean;
};

const states = new Map<string, LimiterState>();

// El mismo DDL que emite la librería (RateLimiterPostgres._getCreateTableStmt),
// duplicado aquí y en el aprovisionamiento (src/scripts/sync-db.ts) a propósito:
// la aplicación no debe NECESITAR `CREATE` para funcionar (plan 08, D8.4).
const CREATE_RATE_LIMITS_SQL = `CREATE TABLE IF NOT EXISTS rate_limits (
      key varchar(255) PRIMARY KEY,
      points integer NOT NULL DEFAULT 0,
      expire bigint
    );`;

function pgErrorCode(e: unknown): string | undefined {
  const wrapped = e as { original?: { code?: string }; parent?: { code?: string } };
  return wrapped?.original?.code ?? wrapped?.parent?.code;
}

/**
 * Intenta poner el limitador sobre PostgreSQL. La sonda es un SELECT y no el
 * `CREATE TABLE IF NOT EXISTS` de la librería porque ese CREATE falla con
 * `42501 permission denied` AUNQUE LA TABLA YA EXISTA si el usuario no tiene
 * `CREATE` en el esquema (comprobado contra PostgreSQL 16; es la situación
 * normal del usuario de aplicación en la base administrada, PostgreSQL 15+ no
 * concede `CREATE` en `public` por defecto). Solo si la sonda dice «la tabla
 * no existe» (42P01) se intenta crearla — cortesía para entornos de desarrollo
 * sin aprovisionar; en producción la crea el plan 08/D8.4 y `db:sync`.
 */
async function connectPostgres(
  state: LimiterState,
  keyPrefix: string,
  points: number,
  duration: number,
  blockDuration: number
): Promise<void> {
  try {
    try {
      await sequelize.query('SELECT 1 FROM rate_limits LIMIT 1;');
    } catch (probeError) {
      if (pgErrorCode(probeError) !== '42P01') throw probeError; // conexión caída u otro fallo real
      await sequelize.query(CREATE_RATE_LIMITS_SQL);
    }

    // `tableCreated: true`: la sonda acaba de garantizar que la tabla existe,
    // y así el constructor no ejecuta ningún DDL (ni exige el permiso CREATE).
    state.active = new RateLimiterPostgres({
      storeClient: sequelize,
      storeType: 'sequelize',
      tableName: 'rate_limits',
      tableCreated: true,
      keyPrefix,
      points,
      duration,
      blockDuration,
      insuranceLimiter: state.fallback,
    });

    if (state.degradedSince !== null) {
      const seconds = Math.round((Date.now() - state.degradedSince) / 1000);
      console.info(
        `El limitador "${keyPrefix}" vuelve a PostgreSQL tras ${seconds}s degradado a memoria; ` +
          'los contadores acumulados en memoria durante la degradación no se migran.'
      );
      state.degradedSince = null;
    }
    state.retryAt = null;
  } catch (e) {
    if (state.degradedSince === null) state.degradedSince = Date.now();
    state.active = state.fallback;
    state.retryAt = Date.now() + RETRY_MS;
    console.error(
      `El limitador "${keyPrefix}" no puede usar PostgreSQL; degrada a memoria ` +
        `(fail-closed) y se reintenta en ${RETRY_MS / 1000}s.`,
      e
    );
  }
}

/**
 * Construcción perezosa: el módulo se importa durante `next build`, y conectar
 * al importarlo obligaría a tener PostgreSQL disponible para compilar.
 *
 * Mientras la conexión (o reconexión) está en vuelo se responde con el seguro
 * de memoria: el limitador nunca falla abierto, ni siquiera en la primera
 * petición del proceso. Una caída de PostgreSQL POSTERIOR a la conexión no
 * pasa por aquí: `RateLimiterPostgres` absorbe esos fallos con su
 * `insuranceLimiter` (el mismo `fallback`) y vuelve solo cuando la base
 * responde de nuevo — verificado deteniendo el contenedor.
 */
function getLimiter(
  keyPrefix: string,
  points: number,
  duration: number,
  blockDuration: number
): RateLimiterAbstract {
  let state = states.get(keyPrefix);
  if (!state) {
    const fallback = insurance(keyPrefix, points, duration, blockDuration);
    state = { active: fallback, fallback, retryAt: 0, degradedSince: null, connecting: false };
    states.set(keyPrefix, state);
  }

  if (state.retryAt !== null && Date.now() >= state.retryAt && !state.connecting) {
    const s = state;
    s.connecting = true;
    // Se fija el siguiente reintento ANTES de conectar: si la conexión tarda,
    // las peticiones que lleguen mientras tanto no encolan más intentos.
    s.retryAt = Date.now() + RETRY_MS;
    void connectPostgres(s, keyPrefix, points, duration, blockDuration).finally(() => {
      s.connecting = false;
    });
  }

  return state.active;
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
 * La tabla de `RateLimiterPostgres` declara `key varchar(255)` y la librería
 * antepone `account:` a lo que devuelva `accountKey`. Una clave más larga hacía
 * que el limitador fallara ABIERTO (R2-03a): el `SELECT` de `get()` no falla con
 * un parámetro largo (devuelve null, «sin cuota gastada»), pero el `INSERT` de
 * `consume()` respondía `22001 value too long`, el insuranceLimiter lo absorbía
 * y la penalización quedaba en una memoria que la comprobación nunca leía — el
 * 429 no llegaba jamás, y cada clave sobredimensionada quedaba además retenida
 * en `MemoryStorage`, que no tiene tope ni LRU.
 */
const PG_KEY_MAX = 255;
const ACCOUNT_RAW_MAX = PG_KEY_MAX - 'account:'.length;

/**
 * Clave del cubo de credenciales: `(email, ip)`. El email se normaliza igual que
 * siempre; la IP sale de `clientIdentifier`, que el cliente no controla (§7.4).
 * `::` no puede aparecer en la parte de email de forma ambigua ni en una IP v4,
 * y en una IPv6 la clave sigue siendo unívoca porque el email va primero.
 *
 * Si la clave no cabe en `rate_limits.key` (varchar(255), descontando el
 * prefijo `account:`), se sustituye por su SHA-256 en hex: 64 caracteres, cabe
 * siempre y no puede chocar con una clave en claro — toda clave en claro
 * contiene `@` y `::`, que no son hex. `loginSchema` ya corta los emails de más
 * de 254, así que esta rama solo se alcanza con una IPv6 larga detrás de un
 * email casi al límite, o si algún día la validación se relaja: es defensa en
 * profundidad, no el freno principal (R2-03a).
 */
function accountKey(email: string, request: NextRequest): string {
  const raw = `${normalizeEmail(email)}::${clientIdentifier(request)}`;
  if (raw.length <= ACCOUNT_RAW_MAX) return raw;
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Comprueba la cuota de credenciales SIN consumirla. Se llama después de validar
 * el cuerpo y ANTES de verificar la contraseña: si la cuota está AGOTADA se
 * responde 429 sin gastar CPU en bcrypt (también a quien traiga la contraseña
 * correcta: con 10 fallos acumulados ya no se distingue de un atacante); mientras
 * quede al menos un punto, un intento correcto entra — el consumo solo ocurre en
 * `penalizeAccountRateLimit`.
 *
 * `get()` de rate-limiter-flexible devuelve `null` si la clave no existe y un
 * `RateLimiterRes` (con `remainingPoints` y `msBeforeNext`) si existe; los fallos
 * del almacén los absorbe el insuranceLimiter. Si aun así algo se colara, se
 * responde 429: este límite falla CERRADO, igual que el resto del módulo.
 */
export async function checkAccountRateLimit(email: string, request: NextRequest) {
  try {
    const res = await accountLimiter().get(accountKey(email, request));
    if (res !== null && res.remainingPoints <= 0) {
      return tooManyRequests(res);
    }
    return null;
  } catch (e) {
    return tooManyRequests(e);
  }
}

/**
 * Consume UN punto de la cuota `(email, ip)`. Se llama solo cuando el intento de
 * login FALLA (credenciales inválidas o cuenta deshabilitada). Si este fallo agota
 * la cuota, el rechazo de `consume` se ignora a propósito: la petición actual ya
 * lleva su 401 y el 429 lo dará la siguiente comprobación.
 */
export async function penalizeAccountRateLimit(email: string, request: NextRequest) {
  try {
    await accountLimiter().consume(accountKey(email, request));
  } catch {
    // Cuota agotada o fallo del almacén: nada que hacer aquí.
  }
}

/**
 * Devuelve la cuota de `(email, ip)` tras un login correcto: quien acierta a la
 * cuarta no arrastra los tres fallos anteriores.
 *
 * Deliberadamente NO toca el cubo por IP. Borrarlo sería un agujero: bastaría con
 * poseer una credencial válida cualquiera para intercalar un acierto propio cada
 * pocos intentos y adivinar contra otras cuentas de forma indefinida.
 */
export async function resetAccountRateLimit(email: string, request: NextRequest) {
  try {
    await accountLimiter().delete(accountKey(email, request));
  } catch {
    // Un fallo aquí solo significa que el usuario conserva el intento gastado.
  }
}
