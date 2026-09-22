import type { Sequelize } from 'sequelize';

/**
 * 0005 — Tabla puente invitado ⇄ fecha (guest_schedules).
 *
 * Habilita "invitados distintos por fecha": un invitado (carga/acompañante) puede quedar
 * ligado a fechas específicas del evento, igual que participant_schedules liga participantes
 * con fechas. Antes, el vínculo invitado→fecha vivía en la columna Guest.scheduleId (un solo
 * valor, se pisaba con la 1ª fecha), y ninguna consulta filtraba invitados por fecha: todos
 * los invitados de un participante se mostraban en TODAS sus fechas.
 *
 * BACKFILL (preserva el comportamiento actual): cada invitado existente se liga a TODAS las
 * fechas en las que su participante está inscrito. Así, tras migrar, los invitados siguen
 * apareciendo en todas las fechas del participante (nada cambia para eventos ya cargados).
 * El nuevo flujo de inscripción por fecha empezará a ligar invitados a fechas puntuales.
 *
 * DDL explícito e idempotente. gen_random_uuid() es nativo en PostgreSQL 13+.
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS guest_schedules (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      guest_id    uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
      schedule_id uuid NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
      confirmed   boolean NOT NULL DEFAULT false,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS unique_guest_schedule ON guest_schedules (guest_id, schedule_id);'
  );
  // Índice de apoyo para filtrar los invitados de una fecha.
  await sequelize.query(
    'CREATE INDEX IF NOT EXISTS idx_guest_schedules_schedule ON guest_schedules (schedule_id);'
  );

  // Respaldo: liga cada invitado (no borrado) a todas las fechas de su participante.
  await sequelize.query(`
    INSERT INTO guest_schedules (guest_id, schedule_id, confirmed)
    SELECT g.id, ps.schedule_id, COALESCE(g.confirmed, false)
    FROM guests g
    JOIN participant_schedules ps ON ps.participant_id = g.participant_id
    WHERE g.deleted_at IS NULL
    ON CONFLICT (guest_id, schedule_id) DO NOTHING;
  `);
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('DROP TABLE IF EXISTS guest_schedules;');
};
