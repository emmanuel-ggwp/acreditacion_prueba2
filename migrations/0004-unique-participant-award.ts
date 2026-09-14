import type { Sequelize } from 'sequelize';

/**
 * 0004 — Índice único (participant_id, award_id) en participant_awards.
 *
 * Defensa en profundidad contra doble asignación del mismo premio a la misma persona:
 * hasta ahora solo lo evitaba un chequeo a nivel app (con posible carrera). No hay
 * duplicados en producción porque la ruta viva ya bloqueaba la fila del Award, así que
 * crear el índice es seguro. Idempotente (IF NOT EXISTS).
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS unique_participant_award ON participant_awards (participant_id, award_id);');
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('DROP INDEX IF EXISTS unique_participant_award;');
};
