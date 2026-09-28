/**
 * Servicio de capacidad (aforo por participantes).
 *
 * Calcula cuántos participantes hay inscritos por fecha/horario y por evento,
 * y anota los objetos de evento con la información de capacidad que consume la
 * landing pública (cupos ocupados, disponibles y estado "lleno").
 *
 * Todas las consultas son SQL cruda (`sequelize.query` con `QueryTypes.SELECT`)
 * y filtran `participants.deleted_at IS NULL` explícitamente, porque el modelo
 * usa borrado lógico (paranoid) y Sequelize no agrega ese filtro en SQL cruda.
 * La capacidad cuenta PARTICIPANTES inscritos, nunca invitados.
 */
import { sequelize } from '@/lib/sequelize';
import { QueryTypes } from 'sequelize';

// La capacidad cuenta PARTICIPANTES inscritos (no invitados). Excluye participantes eliminados.

/**
 * Cuenta cuántos participantes hay inscritos a una fecha (horario) concreta.
 *
 * Ejecuta un `COUNT(*)` en SQL cruda uniendo `participant_schedules` con
 * `participants`, excluyendo participantes con borrado lógico.
 *
 * @param scheduleId - Identificador del horario/fecha (`event_schedules.id`) a contar.
 * @param transaction - Transacción Sequelize opcional para ejecutar la consulta dentro de ella.
 * @returns Promesa que resuelve al número de participantes inscritos en esa fecha (0 si no hay ninguno).
 */
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

/**
 * Cuenta cuántos participantes DISTINTOS hay inscritos en un evento (con al menos una fecha).
 *
 * Usa `COUNT(DISTINCT ps.participant_id)` en SQL cruda para no contar dos veces
 * a un participante inscrito en varias fechas; excluye participantes con borrado lógico.
 *
 * @param eventId - Identificador del evento (`events.id`) a contar.
 * @param transaction - Transacción Sequelize opcional para ejecutar la consulta dentro de ella.
 * @returns Promesa que resuelve al número de participantes distintos inscritos en el evento (0 si no hay ninguno).
 */
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
 * Anota (muta y devuelve) el objeto plano de un evento con la info de capacidad para la landing.
 *
 * Cuenta los inscritos de todos los horarios del evento en una sola consulta
 * agrupada (SQL cruda) y luego, por cada horario y para el evento completo,
 * agrega los campos derivados. MUTA `eventPlain` en el sitio además de devolverlo.
 * Agrega:
 * - `eventFull`: `true` si el evento alcanzó su capacidad máxima (`maxCapacity` > 0 y ocupados ≥ máximo).
 * - `capacityInfo`: `{ eventCount, eventMax }` con los inscritos y el cupo del evento.
 * - por cada horario en `schedules`: `registeredCount`, `full` y `spotsLeft`
 *   (`null` cuando el horario no define `maxCapacity`).
 *
 * @param eventPlain - Objeto plano del evento (se espera un arreglo `schedules`; si falta se trata como vacío). Se MODIFICA in situ.
 * @returns Promesa que resuelve al mismo objeto `eventPlain` ya anotado con la información de capacidad.
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
