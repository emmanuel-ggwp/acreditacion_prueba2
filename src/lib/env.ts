import { z } from 'zod';

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
  DATABASE_URL: z
    .string({ error: 'obligatoria: sin ella la aplicación no puede consultar nada' })
    .min(1, 'obligatoria: sin ella la aplicación no puede consultar nada'),
  JWT_SECRET: signingSecret,
  JWT_REFRESH_SECRET: signingSecret,

  // Sin ALLOWED_ORIGIN, tanto next.config.js:27 como middleware/security.ts:3 caen
  // a "*" en silencio. Ese respaldo es F2-04 y se retira en el Bloque B; exigir la
  // variable aquí lo vuelve inalcanzable en producción mientras tanto.
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

  // Opcionales con respaldo en el código, declaradas para que un valor mal escrito
  // se detecte aquí y no como un comportamiento raro más adelante.
  DB_SSL: z.enum(['true', 'false']).optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
});

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);

  if (result.success) return;

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
