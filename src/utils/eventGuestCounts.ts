import { numericGuestsForDateSql } from './adultCompanion';
/** Invitados por evento, sumando cada fecha como las estadísticas de acreditación. */
export const EVENT_GUEST_COUNTS_SQL = `
WITH dates AS (
  SELECT id,event_id FROM event_schedules WHERE event_id IN (:eventIds)
), registered_people AS (
  SELECT ps.participant_id,ps.schedule_id,${numericGuestsForDateSql('p', 'ps.schedule_id')} AS guest_count
  FROM participant_schedules ps JOIN dates d ON d.id = ps.schedule_id
  JOIN participants p ON p.id = ps.participant_id AND p.deleted_at IS NULL
), named_registered AS (
  SELECT gs.guest_id,gs.schedule_id
  FROM guest_schedules gs JOIN dates d ON d.id = gs.schedule_id
  JOIN guests g ON g.id = gs.guest_id AND g.deleted_at IS NULL
  JOIN participants p ON p.id = g.participant_id AND p.deleted_at IS NULL
  UNION
  SELECT g.id,rp.schedule_id FROM guests g
  JOIN registered_people rp ON rp.participant_id = g.participant_id
  WHERE g.deleted_at IS NULL AND g.confirmed IS TRUE AND NOT EXISTS (SELECT 1 FROM guest_schedules gs WHERE gs.guest_id = g.id)
)
SELECT totals.event_id AS "eventId",sum(totals.registered)::int AS "registeredGuests",
  sum(totals.accredited)::int AS "accreditedGuests"
FROM (
  SELECT d.event_id,count(*) AS registered,0 AS accredited
  FROM named_registered nr JOIN dates d ON d.id = nr.schedule_id GROUP BY d.event_id
  UNION ALL
  SELECT d.event_id,COALESCE(sum(rp.guest_count),0),0
  FROM registered_people rp JOIN dates d ON d.id = rp.schedule_id GROUP BY d.event_id
  UNION ALL
  SELECT d.event_id,0,count(a.guest_id) + COALESCE(sum(a.guest_count),0)
  FROM accreditations a JOIN dates d ON d.id = a.event_schedule_id GROUP BY d.event_id
) totals GROUP BY totals.event_id
`;
