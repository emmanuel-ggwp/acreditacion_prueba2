/** Personas con nombre POR FECHA: padrón vigente más ingresos históricos reales. */
export const GUEST_ATTENDANCE_REPORT_SQL = `
WITH dates AS (
  SELECT id, schedule_name, label, start_date_time FROM event_schedules WHERE event_id = :eventId
), registered_guests AS (
  SELECT gs.guest_id, gs.schedule_id
  FROM guest_schedules gs JOIN dates d ON d.id = gs.schedule_id
  JOIN guests g ON g.id = gs.guest_id AND g.deleted_at IS NULL
  JOIN participants p ON p.id = g.participant_id AND p.deleted_at IS NULL
  UNION
  SELECT g.id, ps.schedule_id
  FROM guests g JOIN participants p ON p.id = g.participant_id AND p.deleted_at IS NULL
  JOIN participant_schedules ps ON ps.participant_id = p.id
  JOIN dates d ON d.id = ps.schedule_id
  WHERE g.deleted_at IS NULL AND g.confirmed IS TRUE AND NOT EXISTS (SELECT 1 FROM guest_schedules gs WHERE gs.guest_id = g.id)
), actual_guests AS (
  SELECT a.guest_id, a.event_schedule_id AS schedule_id, min(a.check_in_time) AS check_in_time
  FROM accreditations a JOIN dates d ON d.id = a.event_schedule_id
  WHERE a.guest_id IS NOT NULL GROUP BY a.guest_id, a.event_schedule_id
), guest_keys AS (
  SELECT guest_id, schedule_id FROM registered_guests
  UNION SELECT guest_id, schedule_id FROM actual_guests
  UNION
  SELECT g.id, NULL::uuid FROM guests g
  JOIN participants p ON p.id = g.participant_id AND p.deleted_at IS NULL
  WHERE p.event_id = :eventId AND g.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM registered_guests rg WHERE rg.guest_id = g.id)
    AND NOT EXISTS (SELECT 1 FROM actual_guests ag WHERE ag.guest_id = g.id)
)
SELECT
  trim(concat_ws(' ',p.first_name,p.last_name)) AS "Participante",
  trim(concat_ws(' ',g.first_name,g.last_name)) AS "Invitado",
  g.document_number AS "RUT", g.age AS "Edad", g.guest_type AS "Tipo", g.dietary_preference AS "Dieta",
  CASE WHEN ag.guest_id IS NOT NULL THEN 'Sí' ELSE 'No' END AS "Asistió", ag.check_in_time AS "checkInTime",
  d.start_date_time AS "eventDate", COALESCE(NULLIF(d.label,''),d.schedule_name) AS "scheduleName",
  k.schedule_id AS "scheduleId", rg.guest_id IS NOT NULL AS "registered",
  g.deleted_at IS NOT NULL OR p.deleted_at IS NOT NULL AS "deleted"
FROM guest_keys k JOIN guests g ON g.id = k.guest_id JOIN participants p ON p.id = g.participant_id
LEFT JOIN dates d ON d.id = k.schedule_id
LEFT JOIN registered_guests rg ON rg.guest_id = k.guest_id AND rg.schedule_id = k.schedule_id
LEFT JOIN actual_guests ag ON ag.guest_id = k.guest_id AND ag.schedule_id = k.schedule_id
ORDER BY d.start_date_time NULLS LAST,k.schedule_id,p.last_name,p.first_name,g.first_name,g.id
`;
