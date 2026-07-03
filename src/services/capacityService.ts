import { sequelize } from '@/lib/sequelize';
import { QueryTypes } from 'sequelize';

// La capacidad cuenta PARTICIPANTES inscritos (no invitados). Excluye participantes eliminados.

/** Cuántos participantes hay inscritos a una fecha (horario). */
export async function getScheduleParticipantCount(scheduleId: string, transaction?: any): Promise<number> {
  const rows: any = await sequelize.query(
    `SELECT COUNT(*)::int AS c
       FROM participant_schedules ps
       JOIN participants p ON ps.participant_id = p.id
      WHERE ps.schedule_id = :sid AND p.deleted_at IS NULL`,
    { replacements: { sid: scheduleId }, type: QueryTypes.SELECT, transaction }
  );
  return rows[0]?.c || 0;
}

/** Cuántos participantes distintos hay inscritos en el evento (con al menos una fecha). */
export async function getEventParticipantCount(eventId: string, transaction?: any): Promise<number> {
  const rows: any = await sequelize.query(
    `SELECT COUNT(DISTINCT ps.participant_id)::int AS c
       FROM participant_schedules ps
       JOIN event_schedules es ON ps.schedule_id = es.id
       JOIN participants p ON ps.participant_id = p.id
      WHERE es.event_id = :eid AND p.deleted_at IS NULL`,
    { replacements: { eid: eventId }, type: QueryTypes.SELECT, transaction }
  );
  return rows[0]?.c || 0;
}

/**
 * Anota (muta y devuelve) el evento con la info de capacidad para la landing:
 * - eventFull: si el evento alcanzó su capacidad máxima.
 * - por cada horario: registeredCount, full, spotsLeft.
 */
export async function annotateEventCapacity(eventPlain: any): Promise<any> {
  const schedules = Array.isArray(eventPlain.schedules) ? eventPlain.schedules : [];
  const ids = schedules.map((s: any) => s.id);

  const schedMap: Record<string, number> = {};
  if (ids.length) {
    const rows: any = await sequelize.query(
      `SELECT ps.schedule_id AS "scheduleId", COUNT(*)::int AS c
         FROM participant_schedules ps
         JOIN participants p ON ps.participant_id = p.id
        WHERE ps.schedule_id IN (:ids) AND p.deleted_at IS NULL
        GROUP BY ps.schedule_id`,
      { replacements: { ids }, type: QueryTypes.SELECT }
    );
    rows.forEach((r: any) => { schedMap[r.scheduleId] = r.c; });
  }

  const eventCount = await getEventParticipantCount(eventPlain.id);
  const eventMax = Number(eventPlain.maxCapacity) || 0;
  eventPlain.eventFull = eventMax > 0 && eventCount >= eventMax;
  eventPlain.capacityInfo = { eventCount, eventMax };

  schedules.forEach((s: any) => {
    const c = schedMap[s.id] || 0;
    const max = Number(s.maxCapacity) || 0;
    s.registeredCount = c;
    s.full = max > 0 && c >= max;
    s.spotsLeft = max > 0 ? Math.max(0, max - c) : null;
  });

  return eventPlain;
}
