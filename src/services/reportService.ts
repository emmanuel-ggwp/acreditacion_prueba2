/**
 * Servicio de reportes y estadísticas (ReportService).
 *
 * Genera las métricas y exportaciones del sistema de acreditación: reporte por
 * evento, estadísticas de dashboard y en tiempo real, reportes tabulares de
 * participantes e invitados, y su exportación a CSV.
 *
 * Notas de implementación y reglas de negocio:
 * - Combina el ORM (agregaciones de Sequelize) con SQL cruda (`sequelize.query`)
 *   para las consultas complejas. Las consultas crudas filtran `deleted_at IS NULL`
 *   explícitamente porque varias tablas usan borrado lógico (paranoid) y Sequelize
 *   no agrega ese filtro en SQL cruda.
 * - Distingue PERSONAS (participantes + invitados) de cupos: los invitados pueden
 *   ser "con nombre" (filas `Guest`) o NUMÉRICOS (`guestCount`, modos count/companion).
 * - El porcentaje de cupo se calcula solo sobre participantes para que no exceda 100%.
 * - `generateCsv` antepone BOM UTF-8 (acentos correctos en Excel) y neutraliza la
 *   inyección de fórmulas CSV.
 */
import { Op, fn, col, literal, Sequelize, QueryTypes } from 'sequelize';
import { startOfHour, endOfHour, eachHourOfInterval, subMinutes } from 'date-fns';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { sequelize } from '@/lib/sequelize';
import { clParts, clDayRange } from '@/utils/serverDate';

import { 
  Event, 
  EventSchedule, 
  Participant,
  ParticipantSchedule,
  Accreditation,
  Award,
  ParticipantAward
} from '@/models/index';

// ---- Formateo en zona horaria de Chile (America/Santiago) ----
// IMPORTANTE: date-fns `format` usa la TZ del PROCESO (los droplets suelen correr en UTC),
// lo que desfasaba 3-4h las fechas/horas de los reportes exportados y del timeline. Se
// fuerza America/Santiago con Intl (independiente del reloj del servidor), igual que
// src/utils/formatters.ts hace en el cliente. `clParts`/`clDayRange` viven en serverDate.
const clDateTime = (d: Date) => { const t = clParts(d); return `${t.dd}/${t.MM}/${t.yyyy} ${t.HH}:${t.mm}`; };
const clDate = (d: Date) => { const t = clParts(d); return `${t.dd}/${t.MM}/${t.yyyy}`; };
const clTimeHms = (d: Date) => { const t = clParts(d); return `${t.HH}:${t.mm}:${t.ss}`; };
// Clave de bucket por hora (en Santiago), formato 'yyyy-MM-dd HH:00' para el timeline.
const clHourKey = (d: Date) => { const t = clParts(d); return `${t.yyyy}-${t.MM}-${t.dd} ${t.HH}:00`; };

/**
 * Encapsula la generación de reportes, estadísticas y exportaciones CSV del evento.
 */
export class ReportService {

  /**
   * Construye el reporte completo de un evento: estadísticas globales, por fecha, de premios y línea de tiempo.
   *
   * Reúne en lotes (para evitar N+1) los conteos de acreditaciones, inscripciones,
   * invitados (con nombre y numéricos) y premios por horario, y agrega los totales
   * a nivel evento. Cuenta a las personas de forma coherente entre "registrados" y
   * "acreditados" (participantes + invitados con nombre + invitados numéricos) y
   * calcula el `capacityUsedPercentage` solo sobre participantes. La línea de tiempo
   * agrupa las acreditaciones por hora entre la primera y la última.
   *
   * @param eventId - Identificador del evento a reportar.
   * @returns Promesa que resuelve a `{ eventInfo, participantStats, scheduleStats, awardStats, accreditationTimeline }`. Si el evento no tiene horarios, devuelve las estadísticas en cero.
   * @throws {Error} `'Event not found'` si no existe un evento con ese `id`.
   */
  async getEventReport(eventId: string) {
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error('Event not found');

    // 1. Get all schedules for this event
    const schedules = await EventSchedule.findAll({ 
        where: { eventId },
        order: [
            [literal(`CASE 
              WHEN status = 'accrediting' THEN 1 
              WHEN status = 'published' THEN 2 
              WHEN status = 'accredited' THEN 3 
              ELSE 4 
            END`), 'ASC'],
            ['startDateTime', 'ASC']
        ]
    });
    const scheduleIds = schedules.map(s => s.id);

    if (scheduleIds.length === 0) {
        return {
            eventInfo: event,
            participantStats: { registered: 0, registeredGuests: 0, totalRegistered: 0, totalAccredited: 0, accredited: 0, accreditedGuests: 0, attendanceRate: 0 },
            scheduleStats: [],
            awardStats: { assigned: 0, delivered: 0, deliveryRate: 0, pending: 0 },
            accreditationTimeline: []
        };
    }

    // 2. Batch: Get Accreditation counts per schedule (Unique participants/guests)
    const accreditationCounts = await Accreditation.findAll({
        attributes: [
            ['event_schedule_id', 'eventScheduleId'],
            [fn('COUNT', col('id')), 'total'],
            [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'participants'],
            [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'guests'],
            // Invitados NUMÉRICOS que llegaron (modos count/companion; no crean fila Guest).
            [fn('COALESCE', fn('SUM', col('guest_count')), 0), 'numericGuests']
        ],
        where: {
            eventScheduleId: { [Op.in]: scheduleIds }
        },
        group: ['event_schedule_id'],
        raw: true
    }) as unknown as Array<{ eventScheduleId: string, total: number, participants: number, guests: number, numericGuests: number }>;

    const accMap = new Map(accreditationCounts.map(a => [a.eventScheduleId, a]));

    // 3. Batch: Get Registered Participants per schedule 
    const registrationCounts = await ParticipantSchedule.findAll({
        attributes: [
            ['schedule_id', 'scheduleId'],
            [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'count']
        ],
        where: {
            scheduleId: { [Op.in]: scheduleIds }
        },
        group: ['schedule_id'],
        raw: true
    }) as unknown as Array<{ scheduleId: string, count: number }>;

    const regMap = new Map(registrationCounts.map(r => [r.scheduleId, r.count]));

    // 3b. Batch: invitados con NOMBRE registrados por fecha.
    // Fuente autoritativa = guest_schedules (invitados por fecha): cada invitado cuenta en
    // CADA fecha a la que está ligado, así una carga que va a varias fechas se cuenta en
    // TODAS. (Antes se contaba por guest.schedule_id, que solo guarda UNA fecha —la última—
    // y dejaba fuera a las demás: undercount en multi-fecha.) `COUNT(DISTINCT gid)` evita
    // duplicar dentro de una misma fecha. Fallback: invitados SIN ninguna fila
    // guest_schedules se cuentan por su fecha heredada (guest.schedule_id), para datos
    // previos a la feature. `deleted_at IS NULL` porque guests es paranoid y esto es SQL cruda.
    const guestRegistrationQuery = `
        SELECT sub.sid as "scheduleId", COUNT(DISTINCT sub.gid)::int as count
        FROM (
            SELECT gs.schedule_id AS sid, gs.guest_id AS gid
            FROM guest_schedules gs
            INNER JOIN guests g ON g.id = gs.guest_id AND g.deleted_at IS NULL
            WHERE gs.schedule_id IN (:scheduleIds)
            UNION
            SELECT g.schedule_id AS sid, g.id AS gid
            FROM guests g
            WHERE g.schedule_id IN (:scheduleIds) AND g.deleted_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM guest_schedules gs2 WHERE gs2.guest_id = g.id)
        ) sub
        GROUP BY sub.sid
    `;

    const guestRegistrationCounts = await sequelize.query<{ scheduleId: string; count: number }>(guestRegistrationQuery, {
        replacements: { scheduleIds },
        type: QueryTypes.SELECT
    });
    
    const guestRegMap = new Map(guestRegistrationCounts.map(r => [r.scheduleId, r.count]));

    // 3c. Invitados NUMÉRICOS registrados por fecha (Participant.guestCount de los modos
    // count/companion; no crean fila Guest). Se suma el declarado de cada participante
    // inscrito en la fecha, para que "registrados" sea comparable con "acreditados".
    const numericRegQuery = `
        SELECT ps.schedule_id as "scheduleId", COALESCE(SUM(p.guest_count), 0)::int as count
        FROM participant_schedules ps
        INNER JOIN participants p ON p.id = ps.participant_id
        WHERE ps.schedule_id IN (:scheduleIds) AND p.deleted_at IS NULL
        GROUP BY ps.schedule_id
    `;
    const numericRegCounts = await sequelize.query<{ scheduleId: string; count: number }>(numericRegQuery, {
        replacements: { scheduleIds },
        type: QueryTypes.SELECT
    });
    const numericRegMap = new Map(numericRegCounts.map(r => [r.scheduleId, r.count]));

    // 4. Batch: Get Awards Delivered per schedule
    const awardsQuery = `
        SELECT ps.schedule_id as "scheduleId", COUNT(pa.id)::int as count
        FROM participant_schedules ps
        INNER JOIN participant_awards pa ON ps.participant_id = pa.participant_id
        INNER JOIN awards a ON pa.award_id = a.id
        WHERE ps.schedule_id IN (:scheduleIds)
          AND a.event_id = :eventId
          AND pa.delivered_at IS NOT NULL
        GROUP BY ps.schedule_id
    `;
    
    const awardsCounts = await sequelize.query<{ scheduleId: string; count: number }>(awardsQuery, {
        replacements: { scheduleIds, eventId },
        type: QueryTypes.SELECT
    });

    const awardMap = new Map(awardsCounts.map(a => [a.scheduleId, a.count]));

    // 5. Build Schedule Details
    const scheduleDetails = schedules.map(s => {
        const accData = accMap.get(s.id) || { total: 0, participants: 0, guests: 0, numericGuests: 0 };
        const registeredParticipants = Number(regMap.get(s.id) || 0);
        // Invitados registrados = con nombre (filas) + numéricos declarados.
        const registeredGuests = Number(guestRegMap.get(s.id) || 0) + Number(numericRegMap.get(s.id) || 0);
        const registeredTotal = registeredParticipants + registeredGuests;
        const awardsDelivered = Number(awardMap.get(s.id) || 0);
        // Acreditados = filas (participantes + invitados con nombre) + invitados numéricos.
        const accNumericGuests = Number(accData.numericGuests) || 0;
        const accreditedGuests = Number(accData.guests || 0) + accNumericGuests;
        const accTotal = (Number(accData.total) || 0) + accNumericGuests;
        const capacity = s.maxCapacity ?? event.maxCapacity ?? 0;

        return {
            scheduleName: s.scheduleName,
            startDateTime: s.startDateTime,
            endDateTime: s.endDateTime,
            // capacity = CUPO DE PARTICIPANTES; maxAttendees = AFORO total (personas), informativo.
            capacity,
            maxAttendees: (s as any).maxAttendees ?? null,
            registered: registeredTotal,
            registeredTotal,
            registeredParticipants,
            registeredGuests,
            accreditedTotal: accTotal,
            accreditedParticipants: Number(accData.participants) || 0,
            accreditedGuests,
            awardsDelivered,
            // % del cupo de PARTICIPANTES (participantes acreditados / cupo), no personas:
            // así el porcentaje no se pasa de 100% al incluir invitados.
            capacityUsedPercentage: capacity > 0 ? ((Number(accData.participants) || 0) / capacity) * 100 : 0,
        };
    });

    // 6. Totales del evento = SUMA de las fechas (coherente con los cards por fecha).
    // El total del evento es la suma de cada fecha: si una persona (participante o
    // invitado) está inscrita/acreditada en varias fechas, cuenta en CADA una, para que
    // "total del evento" cuadre exactamente con la suma de los cards por fecha.
    // (Antes se contaba por PERSONA única con consultas DISTINCT; se cambió a suma por
    // fecha a pedido del negocio: el total refleja asistencias/cupos por fecha, no
    // personas únicas. El invariante "acreditados ≤ registrados" se mantiene porque en
    // cada fecha los acreditados ≤ registrados, y la suma conserva esa relación.)
    const sumSchedules = (pick: (d: (typeof scheduleDetails)[number]) => number) =>
        scheduleDetails.reduce((acc, d) => acc + (Number(pick(d)) || 0), 0);
    const totalParticipants = sumSchedules(d => d.registeredParticipants);
    const totalRegisteredGuests = sumSchedules(d => d.registeredGuests);
    const totalAccreditedParticipants = sumSchedules(d => d.accreditedParticipants);
    const totalAccreditedGuests = sumSchedules(d => d.accreditedGuests);

    const awardsAssigned = await ParticipantAward.count({ include: [{ model: Award, where: { eventId }, attributes: [] }] });
    const awardsDeliveredTotal = await ParticipantAward.count({
      where: { deliveredAt: { [Op.ne]: null } },
      include: [{ model: Award, where: { eventId }, attributes: [] }]
    });

    // 7. Timeline
    const accreditations = await Accreditation.findAll({
        attributes: ['checkInTime'],
        include: [{ model: EventSchedule, where: { eventId }, attributes: [] }],
        order: [['checkInTime', 'ASC']],
        raw: true
    });

    let accreditationTimeline: { hour: string, count: number }[] = [];
    if (accreditations.length > 0) {
        const firstTime = accreditations[0].checkInTime;
        const lastTime = accreditations[accreditations.length - 1].checkInTime;
        
        const hourMap = new Map<string, number>();
        
        // Las horas se bucketean y etiquetan en Santiago (clHourKey), no en la TZ del
        // servidor: así una acreditación cercana a medianoche cae en la hora/día correctos.
        const interval = eachHourOfInterval({ start: startOfHour(firstTime), end: endOfHour(lastTime) });
        interval.forEach(d => hourMap.set(clHourKey(d), 0));

        accreditations.forEach((acc) => {
            const key = clHourKey(acc.checkInTime);
            if (hourMap.has(key)) {
                hourMap.set(key, (hourMap.get(key) || 0) + 1);
            }
        });

        accreditationTimeline = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));
    }

    return {
      eventInfo: event,
      participantStats: {
        registered: totalParticipants,
        registeredGuests: totalRegisteredGuests,
        totalRegistered: totalParticipants + totalRegisteredGuests,
        totalAccredited: totalAccreditedParticipants + totalAccreditedGuests,
        accredited: totalAccreditedParticipants,
        accreditedGuests: totalAccreditedGuests,
        // Tasa sobre PERSONAS (participantes + invitados), coherente con registrados/acreditados.
        attendanceRate: (totalParticipants + totalRegisteredGuests) > 0
          ? ((totalAccreditedParticipants + totalAccreditedGuests) / (totalParticipants + totalRegisteredGuests)) * 100
          : 0,
      },
      scheduleStats: scheduleDetails,
      awardStats: {
        assigned: awardsAssigned,
        delivered: awardsDeliveredTotal,
        deliveryRate: awardsAssigned > 0 ? (awardsDeliveredTotal / awardsAssigned) * 100 : 0,
        pending: awardsAssigned - awardsDeliveredTotal,
      },
      accreditationTimeline,
    };
  }

  /**
   * Obtiene las estadísticas del panel (dashboard), a nivel de un evento o globales.
   *
   * Si se pasa `eventId`, devuelve métricas de ese evento (participantes, acreditados
   * y premios pendientes); si no, devuelve métricas globales (total y eventos activos,
   * total de participantes y acreditaciones de hoy).
   *
   * @param eventId - Identificador opcional del evento; si se omite se devuelven las estadísticas globales.
   * @returns Promesa que resuelve a `{ eventName, totalParticipants, totalAccredited, awardsPending }` (con evento) o a `{ totalEvents, activeEvents, totalParticipants, accreditationsToday }` (global).
   * @throws {Error} `'Event not found'` si se pasa `eventId` y no existe ese evento.
   */
  async getDashboardStats(eventId?: string) {
    if (eventId) {
      const event = await Event.findByPk(eventId);
      if (!event) throw new Error('Event not found');
      const accreditedCount = await Accreditation.count({ include: [{ model: EventSchedule, where: { eventId } }] });
      const awardsPending = await ParticipantAward.count({
        where: { deliveredAt: null },
        include: [{ model: Award, where: { eventId } }]
      });
      return {
        eventName: event.name,
        // Inscripciones (SUMA por fecha): un participante en varias fechas cuenta en cada
        // una, coherente con totalAccredited (que ya cuenta por fecha) y con el resto de
        // totales del evento. Sin `distinct` → COUNT(*) de las inscripciones del evento.
        totalParticipants: await Participant.count({
          include: [{
            model: EventSchedule,
            as: 'schedules',
            where: { eventId },
            required: true
          }],
        }),
        totalAccredited: accreditedCount,
        awardsPending,
      };
    } else {
      // "Hoy" = el día en America/Santiago (no el del servidor, que en prod es UTC).
      const { start, end } = clDayRange();
      return {
        totalEvents: await Event.count(),
        // Eventos vigentes (no cancelados): es lo que el panel muestra arriba.
        activeEvents: await Event.count({ where: { isActive: true } }),
        totalParticipants: await Participant.count(),
        accreditationsToday: await Accreditation.count({
          where: { checkInTime: { [Op.gte]: start, [Op.lt]: end } }
        }),
      };
    }
  }

  /**
   * Calcula estadísticas en tiempo real de un evento para monitoreo en vivo.
   *
   * Devuelve las acreditaciones de los últimos 30 minutos, la capacidad actual de
   * cada horario activo (los que están en curso ahora) con cupos disponibles, y el
   * ritmo de acreditación por minuto (acreditados totales / minutos desde la primera).
   *
   * @param eventId - Identificador del evento a monitorear.
   * @returns Promesa que resuelve a `{ accreditationsLast30Min, currentCapacity, accreditationRatePerMinute }`, donde `currentCapacity` lista por horario `{ scheduleName, capacity, accredited, available }` (`available` es `null` si no hay cupo definido).
   */
  async getRealTimeStats(eventId: string) {
    const now = new Date();
    const thirtyMinutesAgo = subMinutes(now, 30);

    const accreditationsLast30Min = await Accreditation.count({
      include: [{ model: EventSchedule, where: { eventId } }],
      where: { checkInTime: { [Op.gte]: thirtyMinutesAgo } }
    });

    // Horarios ABIERTOS a acreditación ahora (estado 'accrediting'), NO por hora: la
    // acreditación en puerta suele abrirse ANTES del inicio del evento. Antes se filtraba
    // por `inicio ≤ ahora ≤ fin`, que dejaba el panel vacío justo durante el check-in previo.
    const activeSchedules = await EventSchedule.findAll({
        where: { eventId, status: 'accrediting' },
        include: [Event]
    });

    const currentCapacity = await Promise.all(activeSchedules.map(async (s: any) => {
        const event = s.Event;
        const capacity = s.maxCapacity ?? event.maxCapacity ?? 0;
        // Acreditados = PARTICIPANTES (participant_id no nulo), coherente con `capacity`
        // (cupo de participantes). Contar también invitados daba "disponibles" negativos.
        const accredited = await Accreditation.count({ where: { eventScheduleId: s.id, participantId: { [Op.ne]: null } } });
        return {
            scheduleName: s.scheduleName,
            capacity,
            accredited,
            // null = sin cupo definido (ilimitado). Antes era Infinity, que JSON.stringify
            // convierte en null igual; se deja explícito para no serializar un no-valor.
            available: capacity > 0 ? capacity - accredited : null
        }
    }));

    // Ritmo RECIENTE (en vivo): acreditaciones de los últimos 30 min / 30. Refleja el pulso
    // actual y baja a 0 en inactividad. Antes era el promedio histórico (total / minutos
    // desde la primera acreditación), que se diluía tras un pico y no reflejaba el ritmo real.
    const accreditationRatePerMinute = accreditationsLast30Min / 30;

    return {
      accreditationsLast30Min,
      currentCapacity,
      accreditationRatePerMinute,
    };
  }

  /**
   * Genera el reporte general por participante de un evento (una fila por inscripción).
   *
   * Ejecuta una consulta SQL cruda que une participantes, sus fechas y acreditaciones,
   * e incluye subconsultas para cantidad de invitados, invitados asistentes, premios
   * entregados y el detalle de invitados. Excluye participantes e invitados con borrado
   * lógico. Mapea el resultado a claves en español y formatea fechas/horas para exportar.
   *
   * @param eventId - Identificador del evento a reportar.
   * @returns Promesa que resuelve a un arreglo de objetos, uno por inscripción, con columnas en español (datos del participante, asistencia, invitados y premios) listas para CSV.
   */
  async getGeneralReport(eventId: string) {
    const query = `
        SELECT 
            p.first_name as "Nombre",
            p.last_name as "Apellido",
            p.document_number as "Documento",
            p.numero_sap as "Número SAP",
            p.company as "Empresa",
            p.position as "Cargo",
            p.phone as "Teléfono",
            p.email as "Email",
            p.dietary_preference as "Dieta",
            p.dietary_comments as "Comentarios Dieta",
            ps.created_at as "registrationDate",
            es.start_date_time as "eventDate",
            CASE WHEN acc.id IS NOT NULL THEN 'Sí' ELSE 'No' END as "Asistencia",
            acc.check_in_time as "checkInTime",
            -- Invitados = con NOMBRE (filas guests ligadas a esta fecha, o sin fecha = fallback)
            -- + NUMÉRICOS declarados (p.guest_count, modos count/companion; no crean fila).
            ((SELECT COUNT(*) FROM guests g
             WHERE g.participant_id = p.id AND g.deleted_at IS NULL
               AND (EXISTS (SELECT 1 FROM guest_schedules gs WHERE gs.guest_id = g.id AND gs.schedule_id = es.id)
                    OR NOT EXISTS (SELECT 1 FROM guest_schedules gs3 WHERE gs3.guest_id = g.id)))
             + COALESCE(p.guest_count, 0))::int as "Cant. Invitados",
            -- Asistentes = invitados con nombre acreditados en esta fecha + numéricos que
            -- llegaron (acc.guest_count de la acreditación del participante en esta fecha).
            ((SELECT COUNT(*) FROM accreditations acc_g
             INNER JOIN guests g ON acc_g.guest_id = g.id
             WHERE g.participant_id = p.id AND acc_g.event_schedule_id = es.id AND g.deleted_at IS NULL)
             + COALESCE(acc.guest_count, 0))::int as "Cant. Invitados Asistentes",
            (SELECT STRING_AGG(a.name, ', ')
             FROM participant_awards pa
             INNER JOIN awards a ON pa.award_id = a.id
             WHERE pa.participant_id = p.id AND a.event_id = :eventId AND pa.delivered_at IS NOT NULL) as "awardName",
            (SELECT STRING_AGG(
                CONCAT_WS(' · ',
                  NULLIF(TRIM(COALESCE(g2.first_name, '') || ' ' || COALESCE(g2.last_name, '')), ''),
                  NULLIF(g2.document_number, ''),
                  CASE WHEN g2.age IS NOT NULL THEN g2.age || ' años' END
                ), '; ' ORDER BY g2.first_name)
             FROM guests g2 WHERE g2.participant_id = p.id AND g2.deleted_at IS NULL
               AND (EXISTS (SELECT 1 FROM guest_schedules gs4 WHERE gs4.guest_id = g2.id AND gs4.schedule_id = es.id)
                    OR NOT EXISTS (SELECT 1 FROM guest_schedules gs5 WHERE gs5.guest_id = g2.id))) as "guestsDetail"
        FROM participants p
        INNER JOIN participant_schedules ps ON p.id = ps.participant_id
        INNER JOIN event_schedules es ON ps.schedule_id = es.id
        LEFT JOIN accreditations acc ON p.id = acc.participant_id AND es.id = acc.event_schedule_id
        WHERE es.event_id = :eventId AND p.deleted_at IS NULL
        ORDER BY p.last_name, p.first_name, es.start_date_time
    `;

    const results = await sequelize.query(query, {
        replacements: { eventId },
        type: QueryTypes.SELECT
    });

    return results.map((row: any) => ({
        "Nombre": row["Nombre"],
        "Apellido": row["Apellido"],
        "Documento": row["Documento"],
        "Número SAP": row["Número SAP"],
        "Empresa": row["Empresa"],
        "Cargo": row["Cargo"],
        "Teléfono": row["Teléfono"],
        "Email": row["Email"],
        "Dieta": row["Dieta"],
        "Comentarios Dieta": row["Comentarios Dieta"],
        "Fecha Inscripción": row["registrationDate"] ? clDateTime(new Date(row["registrationDate"])) : '',
        "Fecha Evento": row["eventDate"] ? clDate(new Date(row["eventDate"])) : '',
        "Asistencia": row["Asistencia"],
        "Hora Acreditación": row["checkInTime"] ? clTimeHms(new Date(row["checkInTime"])) : '',
        "Cant. Invitados": row["Cant. Invitados"],
        "Cant. Invitados Asistentes": row["Cant. Invitados Asistentes"],
        "Invitados (detalle)": row["guestsDetail"] || '',
        "Premio": row["awardName"] || 'No'
    }));
  }

  // Reporte de INVITADOS: una fila por invitado con nombre, RUT, edad, dieta y asistencia.
  // El reporte general es por participante (solo cuenta invitados); este da el detalle por carga.
  /**
   * Genera el reporte detallado de invitados de un evento (una fila por invitado con nombre).
   *
   * A diferencia del reporte general (por participante), este da el detalle por carga:
   * ejecuta SQL cruda uniendo invitados con su participante, marca la asistencia y la
   * hora de acreditación, excluye borrados lógicos y traduce el tipo (`CARGA`→"Carga",
   * `ACOMPANANTE`→"Acompañante") y la dieta (`'NONE'` se muestra vacío).
   *
   * @param eventId - Identificador del evento a reportar.
   * @returns Promesa que resuelve a un arreglo de objetos, uno por invitado, con columnas en español (`Participante`, `Invitado`, `RUT`, `Edad`, `Tipo`, `Dieta`, `Asistió`, `Hora Acreditación`) listas para CSV.
   */
  async getGuestsReport(eventId: string) {
    const query = `
        SELECT
            TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as "Participante",
            TRIM(COALESCE(g.first_name, '') || ' ' || COALESCE(g.last_name, '')) as "Invitado",
            g.document_number as "RUT",
            g.age as "Edad",
            g.guest_type as "Tipo",
            g.dietary_preference as "Dieta",
            CASE WHEN EXISTS (SELECT 1 FROM accreditations acc WHERE acc.guest_id = g.id) THEN 'Sí' ELSE 'No' END as "Asistió",
            (SELECT MIN(acc.check_in_time) FROM accreditations acc WHERE acc.guest_id = g.id) as "checkInTime"
        FROM guests g
        INNER JOIN participants p ON p.id = g.participant_id
        WHERE p.event_id = :eventId AND g.deleted_at IS NULL AND p.deleted_at IS NULL
        ORDER BY p.last_name, p.first_name, g.first_name
    `;

    const results = await sequelize.query(query, {
        replacements: { eventId },
        type: QueryTypes.SELECT
    });

    return results.map((row: any) => ({
        "Participante": row["Participante"],
        "Invitado": row["Invitado"],
        "RUT": row["RUT"] || '',
        "Edad": row["Edad"] ?? '',
        "Tipo": row["Tipo"] === 'CARGA' ? 'Carga' : row["Tipo"] === 'ACOMPANANTE' ? 'Acompañante' : (row["Tipo"] || ''),
        "Dieta": row["Dieta"] && row["Dieta"] !== 'NONE' ? row["Dieta"] : '',
        "Asistió": row["Asistió"],
        "Hora Acreditación": row["checkInTime"] ? clDateTime(new Date(row["checkInTime"])) : '',
    }));
  }

  /**
   * Serializa un arreglo de objetos a una cadena CSV apta para Excel y segura.
   *
   * Toma las columnas de las claves del primer objeto e incluye cabecera. Antepone
   * BOM UTF-8 para que Excel en Windows no rompa los acentos/ñ, y neutraliza la
   * inyección de fórmulas CSV: a toda celda de texto que empiece por `= + - @`
   * (o tabulador/retorno) le antepone un apóstrofo para que se muestre como texto.
   *
   * @param data - Arreglo de filas (objetos); las columnas se toman de las claves del primer elemento.
   * @returns Promesa que resuelve a la cadena CSV (con BOM y cabecera), o a una cadena vacía `''` si `data` es nulo o vacío.
   */
  async generateCsv(data: any[]): Promise<string> {
    if (!data || data.length === 0) {
      return '';
    }
    const columns = Object.keys(data[0]);
    return stringify(data, {
      header: true,
      columns,
      // BOM UTF-8: sin él, Excel en Windows abre el CSV como Windows-1252 y rompe los
      // acentos/ñ ("Muñoz" → "MuÃ±oz", "Teléfono" → "TelÃ©fono").
      bom: true,
      cast: {
        // Anti "inyección de fórmulas" (CSV injection): Excel/Sheets EJECUTAN una celda
        // que empieza por = + - @ (o tab/retorno). Como Nombre/Apellido/Email/Comentarios
        // salen de texto que escribe el público, se antepone un apóstrofo para que se
        // muestre como TEXTO y no se ejecute al abrir el reporte.
        string: (value: string) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value),
      },
    });
  }

  /**
   * Serializa un arreglo de objetos a un libro Excel (.xlsx) en memoria.
   *
   * Toma las columnas de las claves del primer objeto. A diferencia del CSV, Excel abre
   * el .xlsx en UTF-8 sin BOM (acentos/ñ correctos) y `json_to_sheet` escribe cada celda
   * como texto (tipo string), de modo que un valor que empiece por `= + - @` se muestra
   * como texto y NO se ejecuta como fórmula al abrir (sin necesidad del apóstrofo del CSV).
   *
   * @param data - Arreglo de filas (objetos); las columnas se toman de las claves del primer elemento.
   * @param sheetName - Nombre de la hoja (máx. 31 caracteres, límite de Excel).
   * @returns Promesa que resuelve a un `ArrayBuffer` con el archivo .xlsx listo para
   *   descargar (ArrayBuffer es un body válido para `NextResponse`).
   */
  async generateXlsx(data: any[], sheetName = 'Reporte'): Promise<ArrayBuffer> {
    const rows = data && data.length ? data : [{ 'Sin datos': '' }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    // Excel limita el nombre de hoja a 31 caracteres.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
    // type:'buffer' → Node Buffer (en la ruta API, runtime Node). Se devuelve como
    // ArrayBuffer (body válido para NextResponse), recortado a su rango exacto de bytes
    // (un Buffer puede ser una vista sobre un ArrayBuffer agrupado más grande).
    const out = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
  }
}

export const reportService = new ReportService();
