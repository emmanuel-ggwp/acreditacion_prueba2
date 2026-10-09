import type { Sequelize } from 'sequelize';

/**
 * 0008 — Backfill de `audit_logs.event_id` (recupera el historial "por evento").
 *
 * La 0007 agrega la columna `event_id` Y rellena el histórico de acreditaciones.
 * Pero si en un entorno la columna se agregó a mano (p. ej. un `ALTER TABLE … ADD
 * COLUMN` directo por psql durante un incidente), ese backfill NO corrió: todos los
 * logs de acreditación previos quedan con `event_id = NULL` y el filtro "actividad
 * por evento" no muestra nada hasta que se vuelve a acreditar.
 *
 * Esta migración vuelve a ejecutar el backfill de forma IDEMPOTENTE, en su propio
 * número, para que corra en el próximo `db:migrate` aunque la 0007 ya figure como
 * aplicada. Si el histórico ya está relleno, actualiza 0 filas (no cambia nada).
 *
 * - Asegura columna e índice con IF NOT EXISTS (self-contained: arregla incluso un
 *   entorno que nunca aplicó la 0007).
 * - Rellena solo `entity = 'Accreditation'` con `event_id` en NULL, cruzando
 *   `details.eventScheduleId` con `event_schedules`. La comparación es por TEXTO
 *   (`es.id::text`): castear `es.id` (siempre un uuid válido) a texto no puede fallar,
 *   mientras que castear el JSON a `::uuid` reventaría si algún valor viniera mal.
 * - Los logs cuyo horario ya fue borrado (EventSchedule NO es paranoid) no tienen
 *   con qué cruzarse y quedan en NULL: caso de borde inevitable y aceptable.
 *
 * Sin `down`: un backfill de datos no se revierte — no se puede distinguir lo que
 * rellenó de lo que ya estaba, y volver a NULL perdería información legítima.
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  // Defensa por si este entorno nunca aplicó la 0007 (columna/índice ausentes).
  await sequelize.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_id uuid;');
  await sequelize.query('CREATE INDEX IF NOT EXISTS audit_logs_event_id_idx ON audit_logs (event_id);');
  // Backfill idempotente (comparación por texto; no castea el JSON a uuid).
  await sequelize.query(`
    UPDATE audit_logs AS al
       SET event_id = es.event_id
      FROM event_schedules AS es
     WHERE al.entity = 'Accreditation'
       AND al.event_id IS NULL
       AND al.details->>'eventScheduleId' = es.id::text;
  `);
};

// Backfill de datos: sin reversa (no destruir lo rellenado).
export const down = async () => {
  /* no-op a propósito */
};
