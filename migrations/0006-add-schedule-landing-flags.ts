import type { Sequelize } from 'sequelize';

/**
 * 0006 — Controles de la landing por fecha (no destructivos).
 *
 * Agrega dos banderas por horario (`event_schedules`), ambas con default `true` para
 * no cambiar el comportamiento de las fechas existentes:
 *
 * - `registration_open`: si es `false`, la fecha aparece en la landing marcada como
 *   "Inscripción cerrada" y el registro público la rechaza. No afecta a quienes ya se
 *   inscribieron ni a la acreditación.
 * - `visible_in_landing`: si es `false`, la fecha NO se muestra en la landing pública.
 *   Sigue disponible para acreditar en la puerta y en los reportes (solo oculta el
 *   auto-registro). Es el reemplazo NO destructivo de "eliminar fecha" (que borraba
 *   las inscripciones en cascada).
 *
 * DDL explícito e idempotente (Postgres: ADD/DROP COLUMN IF [NOT] EXISTS).
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS registration_open boolean NOT NULL DEFAULT true;');
  await sequelize.query('ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS visible_in_landing boolean NOT NULL DEFAULT true;');
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('ALTER TABLE event_schedules DROP COLUMN IF EXISTS registration_open;');
  await sequelize.query('ALTER TABLE event_schedules DROP COLUMN IF EXISTS visible_in_landing;');
};
