import type { Sequelize } from 'sequelize';

/**
 * 0007 — `event_id` en `audit_logs` (filtro por evento rápido, no destructivo).
 *
 * El historial de acreditación por evento filtraba por `details->>'eventScheduleId'`
 * (JSON, sin índice) → escaneo completo de `audit_logs`, que crece sin parar. Esta
 * migración agrega una columna indexada `event_id` para que el filtro por evento sea
 * una búsqueda por índice.
 *
 * - `event_id uuid` (nullable): solo las acreditaciones lo llevan; el resto de logs
 *   queda en NULL. La app lo rellena al escribir cada log de acreditación.
 * - Índice `audit_logs_event_id_idx` para el filtro por evento.
 * - BACKFILL: rellena `event_id` de las acreditaciones ya registradas cruzando
 *   `details->>'eventScheduleId'` con `event_schedules`. Así el historial de eventos
 *   antiguos también se sirve por el índice. Solo toca filas `entity = 'Accreditation'`
 *   (cuyo `eventScheduleId` siempre es un UUID válido).
 *
 * DDL idempotente (Postgres: ADD/DROP COLUMN IF [NOT] EXISTS, CREATE INDEX IF NOT EXISTS).
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_id uuid;');
  await sequelize.query('CREATE INDEX IF NOT EXISTS audit_logs_event_id_idx ON audit_logs (event_id);');
  // Backfill de acreditaciones existentes (details.eventScheduleId -> event_schedules.event_id).
  await sequelize.query(`
    UPDATE audit_logs AS al
       SET event_id = es.event_id
      FROM event_schedules AS es
     WHERE al.entity = 'Accreditation'
       AND al.event_id IS NULL
       AND (al.details->>'eventScheduleId')::uuid = es.id;
  `);
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('DROP INDEX IF EXISTS audit_logs_event_id_idx;');
  await sequelize.query('ALTER TABLE audit_logs DROP COLUMN IF EXISTS event_id;');
};
