import type { Sequelize } from 'sequelize';

/**
 * 0001 — Línea base del esquema (SB-26; plan 08, fase 3).
 *
 * Crea las tablas de los 16 modelos registrados en src/models/index.ts más
 * `rate_limits` (que no es un modelo: la usa RateLimiterPostgres y debe
 * existir ANTES del primer login para que la aplicación nunca necesite el
 * permiso CREATE — P08-D8.4).
 *
 * Es deliberadamente IDEMPOTENTE y no destructiva: `sync()` sin opciones
 * emite `CREATE TABLE IF NOT EXISTS` por modelo — sobre una base ya poblada
 * no toca nada y solo deja constancia en SequelizeMeta de que la base parte
 * de aquí. Trade-off asumido y registrado (P08 fase 3): la línea base se
 * apoya en los MODELOS ACTUALES en vez de en DDL escrito a mano, así que
 * describe el esquema del commit en que se ejecuta, no un esquema congelado.
 * Todo cambio de esquema POSTERIOR a este fichero va en una migración nueva
 * (0002-..., DDL explícito con up/down); modificar los modelos sin su
 * migración es exactamente el agujero que SB-26 documenta.
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  // Registra los modelos sobre la instancia compartida (importación con efecto).
  await import('../src/models/index');

  // Solo crea lo que falte; jamás altera ni borra lo existente.
  await sequelize.sync();

  // Mismo DDL que emite rate-limiter-flexible; duplicado a propósito con
  // src/scripts/sync-db.ts y src/lib/auth-rate-limit.ts (R2-03b).
  await sequelize.query(`CREATE TABLE IF NOT EXISTS rate_limits (
    key varchar(255) PRIMARY KEY,
    points integer NOT NULL DEFAULT 0,
    expire bigint
  );`);
};

export const down = async () => {
  throw new Error(
    '0001-baseline no se revierte: sería DROP de todo el esquema. ' +
    'Si de verdad quieres una base vacía, hazlo a mano en la base de datos.'
  );
};
