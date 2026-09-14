import type { Sequelize } from 'sequelize';

/**
 * 0002 — Aforo total por horario (dos límites separados).
 *
 * `event_schedules.max_capacity` significa CUPO DE PARTICIPANTES (la inscripción
 * cuenta solo participantes, no invitados: ver capacityService). Este cambio agrega
 * `max_attendees` = AFORO TOTAL (participantes + invitados), que se controla al
 * acreditar. NULL = sin límite de aforo (comportamiento previo).
 *
 * DDL explícito e idempotente (Postgres: ADD/DROP COLUMN IF [NOT] EXISTS).
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('ALTER TABLE event_schedules ADD COLUMN IF NOT EXISTS max_attendees integer;');
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('ALTER TABLE event_schedules DROP COLUMN IF EXISTS max_attendees;');
};
