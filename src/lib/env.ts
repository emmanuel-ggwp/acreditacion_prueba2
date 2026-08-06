import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * Validación del entorno al arranque (F6-05 / F2-07).
 *
 * Un fallo de configuración debe ser ruidoso e inmediato. Antes, `DATABASE_URL`
 * ausente dejaba arrancar la aplicación —`process.env.DATABASE_URL || ''`— y
 * fallaba más tarde, en la primera consulta, con un error que no señalaba la
 * causa. Lo mismo con los secretos de firma: `jwt.ts` los marca con `!`, que es
 * solo de compilación, así que la app quedaba degradada a "nadie puede
 * autenticarse" sin ninguna señal en el arranque.
 *
 * Las exigencias se endurecen en producción a propósito: en desarrollo estorban
 * más de lo que protegen.
 */

const isProduction = process.env.NODE_ENV === 'production';

// En producción los secretos de firma deben tener entropía suficiente. 32 caracteres
// no es una garantía criptográfica, pero descarta los valores de ejemplo y los
// "cambiame" que sobreviven a un despliegue apresurado.
// `error` cubre tanto la variable ausente como el tipo incorrecto; sin él, Zod
// responde "expected string, received undefined", que dice qué pasó pero no por
// qué importa — y el mensaje es el único propósito de esta validación.
const signingSecret = isProduction
  ? z
      .string({ error: 'obligatoria: sin ella nadie puede autenticarse' })
      .min(32, 'debe tener al menos 32 caracteres en producción')
  : z.string({ error: 'obligatoria: sin ella nadie puede autenticarse' }).min(1);

const envSchema = z.object({
  // No basta con que exista: `DATABASE_URL=acreditacion` (olvidar el esquema)
  // pasaba un min(1) y Sequelize reventaba con un TypeError en la PRIMERA
  // PETICIÓN — systemd daba el servicio por activo y el primer usuario recibía
  // un 500 que no nombraba la variable (D8, plan 08). Se valida aquí el formato
  // para que el fallo sea un arranque abortado con la variable nombrada.
  DATABASE_URL: z
    .string({ error: 'obligatoria: sin ella la aplicación no puede consultar nada' })
    .min(1, 'obligatoria: sin ella la aplicación no puede consultar nada')
    .refine(
      (v) => {
        try {
          return ['postgres:', 'postgresql:'].includes(new URL(v).protocol);
        } catch {
          return false;
        }
      },
      {
        message:
          'debe ser una URL con esquema postgres:// o postgresql:// ' +
          '(y los caracteres especiales de la contraseña, percent-encoded)',
      }
    ),
  JWT_SECRET: signingSecret,
  JWT_REFRESH_SECRET: signingSecret,

  // Sin ALLOWED_ORIGIN, middleware/security.ts:3 cae a "*" en silencio. Ese
  // respaldo es F2-04 y se retira en el Bloque B; exigir la variable aquí lo
  // vuelve inalcanzable en producción mientras tanto. (next.config.js ya no
  // participa: sus cabeceras CORS se retiraron en D8.2 porque se congelaban
  // en el build — el middleware es la fuente única.)
  ALLOWED_ORIGIN: isProduction
    ? z
        .string({ error: 'obligatoria en producción: sin ella el CORS cae a "*"' })
        .min(1, 'obligatoria en producción: sin ella el CORS cae a "*"')
    : z.string().optional(),

  // Los ficheros subidos deben vivir fuera del árbol del despliegue para sobrevivir
  // a un redeploy. Sin la variable, uploadsStorage.ts:16 escribe en cwd()/uploads,
  // que un `git clone` limpio se lleva por delante.
  UPLOADS_DIR: isProduction
    ? z
        .string({ error: 'obligatoria en producción: ruta absoluta y persistente' })
        .min(1, 'obligatoria en producción: ruta absoluta y persistente')
        .refine((v) => v.startsWith('/'), { message: 'debe ser una ruta absoluta' })
    : z.string().optional(),

  // El puerto decide a qué upstream apunta Nginx: era la única variable del
  // inventario sin declarar ni validar (D7/D8.6, plan 08). Opcional porque
  // `next start` también lo acepta por CLI (`-p`) y sin nada cae al 3000 —
  // ambos caminos son legítimos. Medido (2026-08-06): con `next start`, un
  // PORT malformado NUNCA llega aquí — el CLI de Next rechaza los no numéricos
  // nombrando la variable, y un fuera de rango revienta el bind (el servidor
  // escucha ANTES de que corra register()). Esta entrada existe para que el
  // inventario de variables esté completo y para cualquier arranque futuro
  // que no pase por el CLI de Next.
  PORT: z
    .string()
    .regex(/^\d+$/, 'debe ser un número de puerto TCP (1-65535)')
    .refine((v) => Number(v) >= 1 && Number(v) <= 65535, {
      message: 'debe estar entre 1 y 65535',
    })
    .optional(),

  // La cadena vacía se acepta explícitamente: `DB_SSL=` en un fichero de entorno
  // llega como '' y no como undefined, y es la forma natural de escribir "sin SSL"
  // en un EnvironmentFile de systemd. Sin este `literal('')` el arranque abortaría
  // por la configuración que la propia plantilla recomienda.
  DB_SSL: z.union([z.enum(['true', 'false']), z.literal('')]).optional(),

  // Obligatorias en producción pese a tener respaldo en `jwt.ts`: ese respaldo son
  // 7 días de access token y 30 de refresco, y un access token de 7 días no se
  // puede revocar. Es justo la degradación silenciosa que F6-05 existe para evitar.
  JWT_EXPIRES_IN: isProduction ? z.string().min(1, 'obligatoria en producción') : z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: isProduction
    ? z.string().min(1, 'obligatoria en producción')
    : z.string().optional(),
});

/**
 * D6 (plan 08): UPLOADS_DIR ni se creaba ni se comprobaba. El directorio se
 * creaba perezosamente en la PRIMERA SUBIDA, así que con `ProtectSystem=strict`
 * (o cualquier ruta no escribible) el fallo no aparecía en el arranque sino
 * como un 500 días después, delante de un usuario. Aquí se garantiza en el
 * arranque: se crea si falta (con `StateDirectory=tuacreditacion`, systemd
 * aprovisiona el padre `/var/lib/tuacreditacion` escribible y este mkdir solo
 * añade el subdirectorio) y se prueba una escritura real. Si algo falla, el
 * proceso NO arranca: un fallo de configuración debe ser ruidoso e inmediato,
 * no una petición rota.
 */
function assertUploadsDirWritable(dir: string): void {
  const probe = path.join(dir, `.probe-arranque-${process.pid}`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code ?? 'desconocido';
    console.error(
      `\nUPLOADS_DIR no existe o no se puede escribir (código ${code}). La aplicación no arranca.\n\n` +
        '  - La ruta debe existir y ser escribible ANTES del arranque: la aprovisiona\n' +
        '    systemd (StateDirectory=) o el runbook, no la primera subida.\n' +
        '  - Con ProtectSystem=strict, todo lo que no cuelgue de StateDirectory= o\n' +
        '    ReadWritePaths= es de solo lectura para el servicio.\n'
    );
    process.exit(1);
  }
}

export function validateEnv(): void {
  // Todas las exigencias de arriba cuelgan de NODE_ENV, así que un NODE_ENV
  // equivocado las desactiva TODAS en silencio. Matiz medido en el build real
  // (P08-D3): Turbopack INLINEA process.env.NODE_ENV al compilar, de modo que
  // en el artefacto de `next build` este fichero queda congelado con el modo
  // del build — un `NODE_ENV=development` en el EnvironmentFile ya no relaja
  // la validación del artefacto compilado, pero sí afecta a todo lo que corre
  // sin compilar (scripts tsx) y hace FALLAR el propio `next build` si se
  // hereda al construir. La plantilla dice "production" por eso (D8.3).
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && !['production', 'development', 'test'].includes(nodeEnv)) {
    console.error(`\nNODE_ENV tiene un valor no reconocido. La aplicación no arranca.\n`);
    process.exit(1);
  }

  const result = envSchema.safeParse(process.env);

  if (result.success) {
    // Solo en producción: en desarrollo UPLOADS_DIR es opcional y el respaldo
    // (cwd()/uploads) se crea perezosamente sin systemd de por medio.
    if (isProduction && result.data.UPLOADS_DIR) {
      assertUploadsDirWritable(result.data.UPLOADS_DIR);
    }
    return;
  }

  // R2: se nombra la variable y el motivo, nunca el valor.
  const detalle = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  console.error(
    `\nConfiguración de entorno inválida. La aplicación no arranca.\n\n${detalle}\n\n` +
      'Revisa .example.env: declara todas las variables que la aplicación lee.\n'
  );

  process.exit(1);
}
