import { clParts } from './serverDate';

/** Una sola consulta/snapshot: inscripciones y entradas reales, incluso fuera de la fecha inscrita. */
export const ATTENDANCE_REPORT_SQL = `
WITH dates AS (
  SELECT id, schedule_name, label, start_date_time FROM event_schedules WHERE event_id = :eventId
), registered_people AS (
  SELECT ps.participant_id, ps.schedule_id, ps.created_at
  FROM participant_schedules ps JOIN dates d ON d.id = ps.schedule_id
  JOIN participants p ON p.id = ps.participant_id AND p.deleted_at IS NULL
), registered_named AS (
  SELECT g.participant_id, gs.schedule_id, g.id AS guest_id
  FROM guest_schedules gs JOIN dates d ON d.id = gs.schedule_id
  JOIN guests g ON g.id = gs.guest_id AND g.deleted_at IS NULL
  JOIN participants p ON p.id = g.participant_id AND p.deleted_at IS NULL
  UNION
  SELECT g.participant_id, rp.schedule_id, g.id AS guest_id
  FROM guests g JOIN registered_people rp ON rp.participant_id = g.participant_id
  WHERE g.deleted_at IS NULL
    AND g.confirmed IS TRUE AND NOT EXISTS (SELECT 1 FROM guest_schedules gs WHERE gs.guest_id = g.id)
), named_declarations AS (
  SELECT rn.participant_id, rn.schedule_id,
    count(*)::int AS named_count,
    count(*) FILTER (WHERE g.guest_type = 'CARGA')::int AS loads,
    count(*) FILTER (WHERE g.guest_type = 'ACOMPANANTE')::int AS companions,
    count(*) FILTER (WHERE g.guest_type IS NULL OR g.guest_type NOT IN ('CARGA','ACOMPANANTE'))::int AS others,
    string_agg(concat_ws(' ', g.first_name, nullif(g.last_name,'')), ' / ' ORDER BY g.first_name,g.id) AS detail
  FROM registered_named rn JOIN guests g ON g.id = rn.guest_id
  GROUP BY rn.participant_id, rn.schedule_id
), actual_entries AS (
  SELECT a.participant_id, a.event_schedule_id AS schedule_id, true AS titular,
    NULL::uuid AS guest_id, NULL::text AS guest_type, a.check_in_time,
    COALESCE(a.guest_count,0) AS numeric_count, NULL::text AS detail
  FROM accreditations a JOIN dates d ON d.id = a.event_schedule_id
  WHERE a.participant_id IS NOT NULL
  UNION ALL
  SELECT g.participant_id, a.event_schedule_id, false,
    g.id, g.guest_type, a.check_in_time, 0,
    concat_ws(' ',g.first_name,nullif(g.last_name,'')) ||
      CASE WHEN g.guest_type = 'CARGA' THEN ' [Carga]' WHEN g.guest_type = 'ACOMPANANTE' THEN ' [Acompañante]' ELSE '' END ||
      ' · ' || to_char(a.check_in_time AT TIME ZONE 'America/Santiago','DD-MM-YYYY HH24:MI:SS') ||
      CASE WHEN g.deleted_at IS NOT NULL THEN ' [registro eliminado]' ELSE '' END
  FROM accreditations a JOIN dates d ON d.id = a.event_schedule_id
  JOIN guests g ON g.id = a.guest_id
), actual_totals AS (
  SELECT participant_id, schedule_id, bool_or(titular) AS titular,
    min(check_in_time) FILTER (WHERE titular) AS titular_time,
    min(check_in_time) AS first_time,
    COALESCE(sum(numeric_count),0)::int AS numeric_count,
    count(DISTINCT guest_id)::int AS named_count,
    count(DISTINCT guest_id) FILTER (WHERE guest_type = 'CARGA')::int AS loads,
    count(DISTINCT guest_id) FILTER (WHERE guest_type = 'ACOMPANANTE')::int AS companions,
    count(DISTINCT guest_id) FILTER (WHERE guest_id IS NOT NULL AND (guest_type IS NULL OR guest_type NOT IN ('CARGA','ACOMPANANTE')))::int AS others,
    string_agg(detail,' / ' ORDER BY check_in_time,guest_id) FILTER (WHERE guest_id IS NOT NULL) AS detail
  FROM actual_entries GROUP BY participant_id,schedule_id
), report_keys AS (
  SELECT participant_id,schedule_id FROM registered_people
  UNION SELECT participant_id,schedule_id FROM registered_named
  UNION SELECT participant_id,schedule_id FROM actual_totals
)
SELECT p.id AS "participantId", d.id AS "scheduleId",
  COALESCE(NULLIF(d.label,''),d.schedule_name) AS "scheduleName", d.start_date_time AS "eventDate",
  p.first_name AS "firstName", p.last_name AS "lastName", p.document_number AS "documentNumber",
  p.email, p.phone, p.company, p.position, p.numero_sap AS "numeroSap",
  p.dietary_preference AS "dietaryPreference", p.dietary_comments AS "dietaryComments",
  p.deleted_at IS NOT NULL AS "deleted",
  rp.participant_id IS NOT NULL AS "registered", rp.created_at AS "registrationDate",
  COALESCE(at.titular,false) AS "accredited", at.titular_time AS "checkInTime", at.first_time AS "firstCheckIn",
  COALESCE(nd.named_count,0) AS "namedRegistered", COALESCE(nd.loads,0) AS "loadsRegistered",
  COALESCE(nd.companions,0) AS "companionsRegistered", COALESCE(nd.others,0) AS "othersRegistered",
  CASE WHEN rp.participant_id IS NOT NULL THEN COALESCE(p.guest_count,0) ELSE 0 END AS "numericRegistered",
  CASE WHEN rp.participant_id IS NOT NULL THEN COALESCE(p.guest_loads,0) ELSE 0 END AS "numericLoadsDeclared",
  CASE WHEN rp.participant_id IS NOT NULL THEN COALESCE(p.guest_companion,false) ELSE false END AS "companionDeclared",
  COALESCE(at.named_count,0) AS "namedAccredited", COALESCE(at.loads,0) AS "loadsAccredited",
  COALESCE(at.companions,0) AS "companionsAccredited", COALESCE(at.others,0) AS "othersAccredited",
  COALESCE(at.numeric_count,0) AS "numericAccredited",
  COALESCE(nd.detail,'') AS "registeredDetail", COALESCE(at.detail,'') AS "accreditedDetail",
  (SELECT string_agg(aw.name,', ') FROM participant_awards pa JOIN awards aw ON aw.id = pa.award_id
    WHERE pa.participant_id = p.id AND aw.event_id = :eventId AND pa.delivered_at IS NOT NULL) AS "awards",
  CURRENT_TIMESTAMP AS "snapshotAt"
FROM dates d LEFT JOIN report_keys k ON k.schedule_id = d.id LEFT JOIN participants p ON p.id = k.participant_id
LEFT JOIN registered_people rp ON rp.participant_id = k.participant_id AND rp.schedule_id = k.schedule_id
LEFT JOIN named_declarations nd ON nd.participant_id = k.participant_id AND nd.schedule_id = k.schedule_id
LEFT JOIN actual_totals at ON at.participant_id = k.participant_id AND at.schedule_id = k.schedule_id
ORDER BY d.start_date_time,d.id,p.last_name,p.first_name,p.id
`;

const number = (value: any): number => Number(value) || 0;
const timestamp = (value: any, timeOnly = false): string => {
  if (!value) return '';
  const t = clParts(new Date(value));
  return `${timeOnly ? '' : `${t.dd}/${t.MM}/${t.yyyy} `}${t.HH}:${t.mm}:${t.ss}`;
};
export function attendanceExportRow(row: any) {
  const guestsRegistered = number(row.namedRegistered) + number(row.numericRegistered);
  const guestsAccredited = number(row.namedAccredited) + number(row.numericAccredited);
  const date = row.eventDate ? clParts(new Date(row.eventDate)) : null;
  return {
    'Fecha Evento': date ? `${date.dd}/${date.MM}/${date.yyyy}` : '',
    'Horario': row.scheduleName || '',
    'Nombre': row.firstName || '', 'Apellido': row.lastName || '', 'Documento': row.documentNumber || '',
    'Inscrito en esta fecha': row.registered ? 'Sí' : 'No',
    'Titulares acreditados': row.accredited ? 1 : 0,
    'Invitados inscritos': guestsRegistered,
    'Invitados acreditados': guestsAccredited,
    'Total personas inscritas': (row.registered ? 1 : 0) + guestsRegistered,
    'Total personas acreditadas': (row.accredited ? 1 : 0) + guestsAccredited,
    'Cargas con nombre inscritas': number(row.loadsRegistered),
    'Cargas con nombre acreditadas': number(row.loadsAccredited),
    'Acompañantes con nombre inscritos': number(row.companionsRegistered),
    'Acompañantes con nombre acreditados': number(row.companionsAccredited),
    'Otros invitados con nombre inscritos': number(row.othersRegistered),
    'Otros invitados con nombre acreditados': number(row.othersAccredited),
    'Invitados numéricos inscritos': number(row.numericRegistered),
    'Invitados numéricos acreditados': number(row.numericAccredited),
    'Acompañante numérico declarado': row.companionDeclared ? 'Sí' : 'No',
    'Cargas numéricas declaradas': number(row.numericLoadsDeclared),
    'Hora acreditación titular': timestamp(row.checkInTime),
    'Primer ingreso del grupo': timestamp(row.firstCheckIn),
    'Invitados inscritos (detalle)': row.registeredDetail || '',
    'Invitados acreditados (detalle)': row.accreditedDetail || '',
    'Titular eliminado': row.deleted ? 'Sí' : 'No',
    'Número SAP': row.numeroSap || '', 'Email': row.email || '', 'Teléfono': row.phone || '',
    'Empresa': row.company || '', 'Cargo': row.position || '',
    'Dieta': row.dietaryPreference || '', 'Comentarios Dieta': row.dietaryComments || '',
    'Premio': row.awards || 'No',
    'Fecha Inscripción': timestamp(row.registrationDate),
    'ID fecha': row.scheduleId, 'ID titular': row.participantId,
    'Datos al': timestamp(row.snapshotAt),
  };
}

export function attendanceSummary(rows: any[]) {
  const dates = new Map<string, any>();
  for (const raw of rows) {
    const row = attendanceExportRow(raw);
    const key = String(raw.scheduleId);
    const entry = dates.get(key) || {
      'Fecha Evento': row['Fecha Evento'], 'Horario': row.Horario,
      'Titulares inscritos': 0, 'Invitados inscritos': 0, 'Total personas inscritas': 0,
      'Titulares acreditados': 0, 'Invitados acreditados': 0, 'Total personas acreditadas': 0,
      'Cargas con nombre acreditadas': 0, 'Acompañantes con nombre acreditados': 0,
      'Otros invitados con nombre acreditados': 0, 'Invitados numéricos acreditados': 0,
      'ID fecha': raw.scheduleId, 'Datos al': row['Datos al'],
    };
    entry['Titulares inscritos'] += raw.registered ? 1 : 0;
    for (const field of ['Invitados inscritos','Total personas inscritas','Titulares acreditados','Invitados acreditados','Total personas acreditadas','Cargas con nombre acreditadas','Acompañantes con nombre acreditados','Otros invitados con nombre acreditados','Invitados numéricos acreditados']) entry[field] += number(row[field as keyof typeof row]);
    dates.set(key, entry);
  }
  const result = Array.from(dates.values());
  const total: any = { 'Fecha Evento': '', 'Horario': 'TOTAL (suma de fechas)' };
  for (const field of ['Titulares inscritos','Invitados inscritos','Total personas inscritas','Titulares acreditados','Invitados acreditados','Total personas acreditadas','Cargas con nombre acreditadas','Acompañantes con nombre acreditados','Otros invitados con nombre acreditados','Invitados numéricos acreditados']) total[field] = result.reduce((sum, row) => sum + number(row[field]), 0);
  total['ID fecha'] = ''; total['Datos al'] = result[0]?.['Datos al'] || '';
  return [...result, total];
}
