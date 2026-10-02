/**
 * Servicio de acreditación (check-in) de participantes e invitados en las fechas de un evento.
 *
 * Responsable de acreditar y des-acreditar validando pertenencia al evento, actividad del
 * evento/horario, invitados por fecha (GuestSchedule) y ausencia de acreditación previa. En la
 * puerta NO se aplica tope de aforo ni de cupo; la concurrencia se serializa bloqueando la fila del
 * horario (`LOCK.UPDATE`) dentro de una transacción. También expone estadísticas y listados de apoyo
 * (asistencia por fecha, premiados y requerimientos alimentarios). Toda escritura registra auditoría.
 */
import { z } from 'zod';
import { Op, Transaction, fn, col } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import Accreditation from '@/models/Accreditation';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import GuestSchedule from '@/models/GuestSchedule';
import EventSchedule from '@/models/EventSchedule';
import Event from '@/models/Event';
import { bulkAccreditationSchema } from '@/utils/validators/accreditationSchemas';
import User from '@/models/User';
import { auditLogService } from './auditLogService';
import { dietaryFull, dietaryLabel } from '@/utils/dietary';

// Ayudantes para la auditoría de acreditación: nombre de la persona y texto legible
// de la fecha ("Ceremonia (16 sep)"), en hora de Chile.
const personName = (p: any): string => `${p?.firstName || ''} ${p?.lastName || ''}`.trim() || '(sin nombre)';
const scheduleText = (s: any): string => {
  const base = s?.label || s?.scheduleName || 'la fecha';
  try {
    const d = s?.startDateTime
      ? new Date(s.startDateTime).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: 'short' })
      : '';
    return d ? `${base} (${d})` : base;
  } catch { return base; }
};

/**
 * Lógica de negocio del check-in: acredita/des-acredita a participantes e invitados con transacción
 * y bloqueo de fila, y provee estadísticas y listados de apoyo para el panel de acreditación.
 */
export class AccreditationService {

  /**
   * (Privado) Bloquea la fila del horario (`LOCK.UPDATE`) y valida las precondiciones para acreditar:
   * que el horario y su evento existan y estén activos; que la persona (participante o invitado)
   * pertenezca al evento; que un invitado ligado a fechas concretas solo se acredite en una de ellas
   * (un invitado sin fechas ligadas se permite en cualquiera, como fallback seguro); y que no exista
   * acreditación previa. Si el horario está `published`, lo pasa a `accrediting`. No aplica tope de aforo/cupo.
   *
   * @param ids - `{ participantId?, guestId?, eventScheduleId }`: la persona a acreditar y el horario.
   * @param transaction - Transacción en la que se toma el bloqueo y se ejecutan las validaciones.
   * @returns `{ schedule, person }`: el horario bloqueado y la persona validada.
   * @throws {Error} `'Event schedule not found.'` si el horario no existe.
   * @throws {Error} `'Event schedule is not associated with an event.'` si el horario no tiene evento.
   * @throws {Error} `'The event or schedule is not active.'` si el evento o el horario están inactivos.
   * @throws {Error} `'Participant not found or does not belong to this event.'` si el participante no existe o es de otro evento.
   * @throws {Error} `'Guest not found or does not belong to this event.'` si el invitado no existe o es de otro evento.
   * @throws {Error} `'Este invitado no está registrado para esta fecha.'` si el invitado por fecha no está ligado a este horario.
   * @throws {Error} `'Participant or Guest ID is required.'` si no se entrega ni participante ni invitado.
   * @throws {Error} `'This person has already been accredited for this schedule.'` si ya estaba acreditada en este horario.
   */
  private async _verifyAndLock(
    { participantId, guestId, eventScheduleId }: { participantId?: string; guestId?: string; eventScheduleId: string },
    transaction: Transaction
  ) {
    // Bloqueamos SOLO la fila del horario (sin include): Postgres no permite
    // FOR UPDATE sobre el lado nulable de un outer join. El evento se trae aparte.
    const schedule = await EventSchedule.findByPk(eventScheduleId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!schedule) {
      throw new Error('Event schedule not found.');
    }

    const event = await Event.findByPk(schedule.eventId, { transaction });

    if (!event) {
      throw new Error('Event schedule is not associated with an event.');
    }
    if (!schedule.isActive || !event.isActive) {
      throw new Error('The event or schedule is not active.');
    }

    // Validate that the person belongs to the event
    let person;
    if (participantId) {
        person = await Participant.findByPk(participantId, { transaction });
        if (!person || person.eventId !== schedule.eventId) {
            throw new Error('Participant not found or does not belong to this event.');
        }
    } else if (guestId) {
        person = await Guest.findByPk(guestId, { include: [{ model: Participant, as: 'participant' }], transaction });
        const guestParticipant = (person as any)?.participant;
        if (!person || guestParticipant?.eventId !== schedule.eventId) {
            throw new Error('Guest not found or does not belong to this event.');
        }
        // Invitados POR FECHA: si el invitado está ligado a fechas concretas (GuestSchedule),
        // solo se puede acreditar en una de ESAS fechas. Fallback seguro: un invitado SIN
        // ninguna fecha ligada (cargas antiguas, agregadas por admin) se acredita en cualquier
        // fecha, como antes. Así el check-in respeta "invitados distintos por fecha" sin
        // bloquear datos previos a la funcionalidad.
        const totalLinks = await GuestSchedule.count({ where: { guestId }, transaction });
        if (totalLinks > 0) {
            const forThisDate = await GuestSchedule.count({ where: { guestId, scheduleId: eventScheduleId }, transaction });
            if (!forThisDate) {
                throw new Error('Este invitado no está registrado para esta fecha.');
            }
        }
    } else {
        throw new Error('Participant or Guest ID is required.');
    }

    // La ACREDITACIÓN no tiene tope: en la puerta no se limita por aforo ni por cupo.
    // El cupo de participantes (maxCapacity) es solo un límite de INSCRIPCIÓN, y el
    // aforo (maxAttendees) es solo informativo. Se sigue bloqueando la fila del
    // horario (arriba) para serializar y evitar acreditaciones duplicadas.

    // Check for prior accreditation
    const idToCheck = participantId || guestId;
    const type = participantId ? 'participant' : 'guest';
    const { isAccredited } = await this.verifyAccreditation(type, idToCheck!, eventScheduleId, transaction);
    if (isAccredited) {
      throw new Error('This person has already been accredited for this schedule.');
    }

    // Update schedule status to 'accrediting' if it is 'published'
    if (schedule.status === 'published') {
      await schedule.update({ status: 'accrediting' }, { transaction });
    }
    
    return { schedule, person };
  }

  /**
   * Acredita a un participante en un horario dentro de una transacción (con bloqueo de fila vía
   * `_verifyAndLock`), registrando cuántos invitados numéricos llegaron. Registra auditoría.
   *
   * @param participantId - ID del participante a acreditar.
   * @param eventScheduleId - ID del horario en el que se acredita.
   * @param accreditedBy - ID del usuario que acredita (queda en `accreditedBy` y en la auditoría).
   * @param notes - Notas opcionales de la acreditación.
   * @param guestCount - Nº de invitados numéricos que llegaron (se normaliza a un entero ≥ 0).
   * @returns La acreditación creada, recargada con sus asociaciones vía `getAccreditationById`.
   * @throws {Error} Cualquiera de los errores de `_verifyAndLock` (ver ese método); se revierte la transacción.
   */
  async accreditParticipant(participantId: string, eventScheduleId: string, accreditedBy: string, notes?: string, guestCount?: number) {

    const transaction = await sequelize.transaction();
    try {
      const { schedule, person } = await this._verifyAndLock({ participantId, eventScheduleId }, transaction);

      // Invitados que llegaron (modos numéricos count/companion; en 'named' se acreditan aparte).
      const invitados = Math.max(0, Number(guestCount) || 0);
      const accreditation = await Accreditation.create({
        participantId,
        eventScheduleId,
        accreditedBy,
        checkInTime: new Date(),
        notes,
        guestCount: invitados,
      }, { transaction });

      // Auditoría legible: quién se acreditó, en qué fecha y con cuántos invitados/cargas.
      await auditLogService.log({
        userId: accreditedBy,
        action: 'CREATE',
        entity: 'Accreditation',
        entityId: accreditation.id,
        details: {
          name: personName(person),
          summary: `${scheduleText(schedule)}${invitados ? ` · ${invitados} invitado(s)/carga(s)` : ''}`,
          fecha: scheduleText(schedule),
          invitados,
          participantId,
          eventScheduleId,
        },
      });

      await transaction.commit();
      return this.getAccreditationById(accreditation.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Acredita a un invitado en un horario dentro de una transacción (con bloqueo de fila vía
   * `_verifyAndLock`). Registra auditoría.
   *
   * @param guestId - ID del invitado a acreditar.
   * @param eventScheduleId - ID del horario en el que se acredita.
   * @param accreditedBy - ID del usuario que acredita (queda en `accreditedBy` y en la auditoría).
   * @param notes - Notas opcionales de la acreditación.
   * @returns La acreditación creada, recargada con sus asociaciones vía `getAccreditationById`.
   * @throws {Error} Cualquiera de los errores de `_verifyAndLock` (ver ese método); se revierte la transacción.
   */
  async accreditGuest(guestId: string, eventScheduleId: string, accreditedBy: string, notes?: string) {

    const transaction = await sequelize.transaction();
    try {
      const { schedule, person } = await this._verifyAndLock({ guestId, eventScheduleId }, transaction);

      const accreditation = await Accreditation.create({
        guestId,
        eventScheduleId,
        accreditedBy,
        checkInTime: new Date(),
        notes,
      }, { transaction });

      // Auditoría legible: qué invitado se acreditó, en qué fecha y de qué participante es.
      const guestParticipant = (person as any)?.participant;
      await auditLogService.log({
        userId: accreditedBy,
        action: 'CREATE',
        entity: 'Accreditation',
        entityId: accreditation.id,
        details: {
          name: personName(person),
          summary: `Invitado · ${scheduleText(schedule)}${guestParticipant ? ` · de ${personName(guestParticipant)}` : ''}`,
          fecha: scheduleText(schedule),
          guestId,
          eventScheduleId,
        },
      });

      await transaction.commit();
      return this.getAccreditationById(accreditation.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Des-acreditar un participante: elimina su acreditación y la de sus invitados en ese horario.
  /**
   * Des-acredita a un participante: elimina en una transacción su acreditación en el horario y la de
   * sus invitados en ese mismo horario. Registra auditoría.
   *
   * @param participantId - ID del participante a des-acreditar.
   * @param eventScheduleId - ID del horario del que se retira.
   * @param accreditedBy - ID del usuario que realiza la operación (queda en la auditoría).
   * @returns Objeto `{ removed }` con el número de acreditaciones eliminadas.
   */
  async unaccreditParticipant(participantId: string, eventScheduleId: string, accreditedBy: string) {
    const transaction = await sequelize.transaction();
    try {
      const guests = await Guest.findAll({ where: { participantId }, attributes: ['id'], transaction });
      const guestIds = guests.map((g: any) => g.id);
      const where: any = {
        eventScheduleId,
        [Op.or]: [{ participantId }, ...(guestIds.length ? [{ guestId: { [Op.in]: guestIds } }] : [])],
      };
      const removed = await Accreditation.destroy({ where, transaction });
      // Log legible: quién se des-acreditó y en qué FECHA (no solo UUIDs), igual que al acreditar.
      const participant = await Participant.findByPk(participantId, { transaction });
      const schedule = await EventSchedule.findByPk(eventScheduleId, { transaction });
      await auditLogService.log({
        userId: accreditedBy, action: 'DELETE', entity: 'Accreditation', entityId: participantId,
        details: {
          name: personName(participant),
          fecha: scheduleText(schedule),
          summary: `Des-acreditado · ${scheduleText(schedule)}${removed > 1 ? ` · ${removed} registro(s)` : ''}`,
          participantId, eventScheduleId, removed,
        },
      });
      await transaction.commit();
      return { removed };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Des-acreditar un invitado puntual (corregir su asistencia sin tocar al participante).
  /**
   * Des-acredita a un invitado puntual en un horario (corrige su asistencia sin tocar al titular).
   * Registra auditoría.
   *
   * @param guestId - ID del invitado a des-acreditar.
   * @param eventScheduleId - ID del horario del que se retira.
   * @param accreditedBy - ID del usuario que realiza la operación (queda en la auditoría).
   * @returns Objeto `{ removed }` con el número de acreditaciones eliminadas.
   */
  async unaccreditGuest(guestId: string, eventScheduleId: string, accreditedBy: string) {
    const removed = await Accreditation.destroy({ where: { guestId, eventScheduleId } });
    // Log legible: qué invitado se des-acreditó, en qué FECHA y de qué titular es.
    const guest = await Guest.findByPk(guestId, { include: [{ model: Participant, as: 'participant', attributes: ['firstName', 'lastName'] }] });
    const schedule = await EventSchedule.findByPk(eventScheduleId);
    const guestParticipant = (guest as any)?.participant;
    await auditLogService.log({
      userId: accreditedBy, action: 'DELETE', entity: 'Accreditation', entityId: guestId,
      details: {
        name: personName(guest),
        fecha: scheduleText(schedule),
        summary: `Invitado des-acreditado · ${scheduleText(schedule)}${guestParticipant ? ` · de ${personName(guestParticipant)}` : ''}`,
        guestId, eventScheduleId, removed,
      },
    });
    return { removed };
  }

  // Editar cuántos invitados llegaron (modos numéricos count/companion). No hay tope de
  // aforo en la puerta, así que es una edición simple del contador.
  /**
   * Edita cuántos invitados numéricos llegaron con un participante ya acreditado en un horario
   * (el valor se normaliza a un entero ≥ 0). No hay tope de aforo en la puerta. Registra auditoría.
   *
   * @param participantId - ID del participante acreditado.
   * @param eventScheduleId - ID del horario de la acreditación.
   * @param guestCount - Nuevo número de invitados numéricos (se normaliza a un entero ≥ 0).
   * @param accreditedBy - ID del usuario que edita (queda en la auditoría).
   * @returns La acreditación (`Accreditation`) actualizada.
   * @throws {Error} `'El participante no está acreditado en este horario.'` si no existe la acreditación.
   */
  async setAccreditationGuestCount(participantId: string, eventScheduleId: string, guestCount: number, accreditedBy: string) {
    const acc = await Accreditation.findOne({ where: { participantId, eventScheduleId } });
    if (!acc) throw new Error('El participante no está acreditado en este horario.');
    const prev = Math.max(0, Number((acc as any).guestCount) || 0);
    const next = Math.max(0, Number(guestCount) || 0);
    await acc.update({ guestCount: next });
    // Log legible: quién, en qué FECHA y el cambio de invitados (antes → ahora).
    const participant = await Participant.findByPk(participantId);
    const schedule = await EventSchedule.findByPk(eventScheduleId);
    await auditLogService.log({
      userId: accreditedBy, action: 'UPDATE', entity: 'Accreditation', entityId: (acc as any).id,
      details: {
        name: personName(participant),
        fecha: scheduleText(schedule),
        changes: { invitados: { from: prev, to: next } },
        participantId, eventScheduleId,
      },
    });
    return acc;
  }

  /**
   * Acredita en lote una lista de participantes/invitados. Cada ítem corre en su propio SAVEPOINT
   * (transacción anidada): si uno falla a nivel de BD, se revierte solo ese ítem y el resto continúa.
   * Acumula el nº de creados y los errores por ítem.
   *
   * @param accreditations - Lista de ítems a acreditar; se valida con `bulkAccreditationSchema`.
   * @param accreditedBy - ID del usuario que realiza las acreditaciones.
   * @returns `{ created, errors }`: nº de acreditaciones creadas y detalle de los ítems con error.
   * @throws {z.ZodError} Si `accreditations` no cumple `bulkAccreditationSchema`.
   * @throws {Error} `'Transaction failed: <mensaje>'` si falla el commit de la transacción padre (revierte todo).
   */
  async bulkAccredit(accreditations: z.infer<typeof bulkAccreditationSchema>, accreditedBy: string) {
    const validatedData = bulkAccreditationSchema.parse(accreditations);
    const results = { created: 0, errors: [] as any[] };
    const transaction = await sequelize.transaction();

    try {
        for (const item of validatedData) {
            try {
                // SAVEPOINT por ítem (transacción anidada): si un ítem falla a nivel de BD
                // (deadlock, violación de índice, etc.), se revierte SOLO ese ítem y la
                // transacción padre sigue válida. Antes, un único error de BD abortaba toda
                // la transacción: los ítems siguientes fallaban con "transaction is aborted"
                // y el commit hacía rollback, guardando 0 pero reportando "N creados".
                await sequelize.transaction({ transaction }, async (t) => {
                    if (item.type === 'participant') {
                        await this._verifyAndLock({ participantId: item.participantId, eventScheduleId: item.eventScheduleId }, t);
                        await Accreditation.create({ participantId: item.participantId, eventScheduleId: item.eventScheduleId, accreditedBy, checkInTime: new Date() }, { transaction: t });
                    } else {
                        await this._verifyAndLock({ guestId: item.guestId, eventScheduleId: item.eventScheduleId }, t);
                        await Accreditation.create({ guestId: item.guestId, eventScheduleId: item.eventScheduleId, accreditedBy, checkInTime: new Date() }, { transaction: t });
                    }
                });
                results.created++;
            } catch (error: any) {
                results.errors.push({ data: item, error: error.message });
            }
        }
        await transaction.commit();
        return results;
    } catch (error: any) {
        await transaction.rollback();
        throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Obtiene una acreditación por su ID con sus asociaciones (participante y su evento, invitado y su
   * titular, horario y usuario acreditador).
   *
   * @param accreditationId - ID de la acreditación a buscar.
   * @returns La acreditación (`Accreditation`) con sus asociaciones.
   * @throws {Error} `'Accreditation not found'` si la acreditación no existe.
   */
  async getAccreditationById(accreditationId: string) {
    const accreditation = await Accreditation.findByPk(accreditationId, {
      attributes: ['id', 'checkInTime', 'checkOutTime', 'notes'],
      include: [
        {
          model: Participant,
          attributes: ['id', 'firstName', 'lastName', 'email'],
          include: [{ model: Event, as: 'event', attributes: ['id', 'name'] }]
        },
        {
          model: Guest,
          attributes: ['id', 'firstName', 'lastName'],
          include: [{ model: Participant, as: 'participant', attributes: ['id', 'firstName', 'lastName'] }]
        },
        { model: EventSchedule, attributes: ['id', 'scheduleName', 'startDateTime', 'endDateTime'] },
        { model: User, as: 'accreditedByUser', attributes: ['id', 'firstName', 'lastName'] }
      ],
    });
    if (!accreditation) {
      throw new Error('Accreditation not found');
    }
    return accreditation;
  }

  /**
   * Lista acreditaciones con paginación, opcionalmente filtradas por evento y/o horario, con
   * desempate estable por id (para no saltar ni duplicar filas con el mismo `checkInTime`).
   *
   * @param filters - Filtros: `eventId`, `scheduleId`, `page` (def. 1), `limit` (def. 10).
   * @returns Objeto `{ accreditations, total, page, limit }` con las filas de la página.
   */
  async listAccreditations(filters: { eventId?: string, scheduleId?: string, page?: number, limit?: number }) {
    const { page = 1, limit = 10, eventId, scheduleId } = filters;
    const where: any = {};
    const scheduleWhere: any = {};

    if (scheduleId) where.eventScheduleId = scheduleId;
    if (eventId) scheduleWhere.eventId = eventId;

    const { count, rows } = await Accreditation.findAndCountAll({
      where,
      attributes: ['id', 'checkInTime', 'checkOutTime'],
      include: [
        { 
          model: EventSchedule, 
          where: scheduleWhere, 
          required: !!eventId, 
          attributes: ['id', 'scheduleName'] 
        },
        { 
          model: Participant, 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: Guest, 
          attributes: ['id', 'firstName', 'lastName'] 
        },
        { 
          model: User, 
          as: 'accreditedByUser', 
          attributes: ['id', 'firstName'] 
        }
      ],
      limit,
      offset: (page - 1) * limit,
      // Desempate estable por id: varias acreditaciones con el mismo checkInTime
      // (check-ins rápidos/bulk caen en el mismo instante) no deben saltarse ni
      // duplicarse entre páginas.
      order: [['checkInTime', 'DESC'], ['id', 'DESC']],
    });
    return { accreditations: rows, total: count, page, limit };
  }

  // Estadísticas para el panel de acreditación de un horario:
  // acreditados (participantes), invitados acreditados, total, y premiados del evento.
  /**
   * Calcula las estadísticas de un horario para el panel de acreditación: participantes acreditados,
   * invitados (con nombre + numéricos), total y premiados del evento.
   *
   * @param scheduleId - ID del horario del que se calculan las estadísticas.
   * @returns Objeto `{ participants, guests, total, awarded }`.
   * @throws {Error} `'Schedule not found'` si el horario no existe.
   */
  async getScheduleStats(scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const rows = await Accreditation.findAll({
      where: { eventScheduleId: scheduleId },
      attributes: [
        [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'participants'],
        [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'guests'],
        [fn('COALESCE', fn('SUM', col('guest_count')), 0), 'guestCountSum'],
      ],
      raw: true,
    }) as unknown as Array<{ participants: any; guests: any; guestCountSum: any }>;

    const participants = Number(rows[0]?.participants || 0);
    // Invitados = filas con nombre (guest_id) + invitados numéricos (suma de guest_count).
    const guests = Number(rows[0]?.guests || 0) + Number(rows[0]?.guestCountSum || 0);
    const awarded = await Participant.count({ where: { eventId: (schedule as any).eventId, isAwarded: true } });

    return { participants, guests, total: participants + guests, awarded };
  }

  // Resumen de asistencia por fecha del evento: participantes e invitados acreditados
  // en cada horario, más los totales generales.
  /**
   * Resumen de asistencia por fecha de un evento: participantes e invitados acreditados en cada
   * horario, más los totales generales.
   *
   * @param eventId - ID del evento a resumir.
   * @returns Objeto `{ perSchedule, totals }` con el detalle por fecha y los totales generales.
   */
  async getEventScheduleStats(eventId: string) {
    const schedules = await EventSchedule.findAll({
      where: { eventId },
      order: [['startDateTime', 'ASC']],
    });
    const scheduleIds = schedules.map((s: any) => s.id);

    const counts: Record<string, { participants: number; guests: number }> = {};
    if (scheduleIds.length) {
      const rows = await Accreditation.findAll({
        where: { eventScheduleId: { [Op.in]: scheduleIds } },
        attributes: [
          'eventScheduleId',
          [fn('COUNT', fn('DISTINCT', col('participant_id'))), 'participants'],
          [fn('COUNT', fn('DISTINCT', col('guest_id'))), 'guests'],
          [fn('COALESCE', fn('SUM', col('guest_count')), 0), 'guestCountSum'],
        ],
        group: ['eventScheduleId'],
        raw: true,
      }) as unknown as Array<{ eventScheduleId: string; participants: any; guests: any; guestCountSum: any }>;
      for (const r of rows) {
        counts[r.eventScheduleId] = {
          participants: Number(r.participants || 0),
          guests: Number(r.guests || 0) + Number(r.guestCountSum || 0),
        };
      }
    }

    const perSchedule = schedules.map((s: any) => {
      const c = counts[s.id] || { participants: 0, guests: 0 };
      return {
        scheduleId: s.id,
        label: s.scheduleName,
        startDateTime: s.startDateTime,
        location: s.location,
        participants: c.participants,
        guests: c.guests,
        total: c.participants + c.guests,
      };
    });

    const totals = perSchedule.reduce(
      (acc, s) => ({
        participants: acc.participants + s.participants,
        guests: acc.guests + s.guests,
        total: acc.total + s.total,
      }),
      { participants: 0, guests: 0, total: 0 }
    );

    return { perSchedule, totals };
  }

  // Lista de premiados del evento con su estado de acreditación en el horario dado.
  /**
   * Lista los participantes premiados del evento (por `isAwarded`) con su estado de acreditación en
   * el horario dado.
   *
   * @param scheduleId - ID del horario en el que se comprueba la acreditación.
   * @returns Arreglo de premiados con `isAccredited` y `checkInTime` para ese horario.
   * @throws {Error} `'Schedule not found'` si el horario no existe.
   */
  async getAwardedList(scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const eventId = (schedule as any).eventId;

    const awarded = await Participant.findAll({
      where: { eventId, isAwarded: true },
      attributes: ['id', 'firstName', 'lastName', 'documentNumber', 'awardReason'],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    const ids = awarded.map((p: any) => p.id);

    const accMap: Record<string, Date> = {};
    if (ids.length) {
      const accs = await Accreditation.findAll({
        where: { eventScheduleId: scheduleId, participantId: { [Op.in]: ids } },
        attributes: ['participantId', 'checkInTime'],
        raw: true,
      }) as unknown as Array<{ participantId: string; checkInTime: Date }>;
      for (const a of accs) accMap[a.participantId] = a.checkInTime;
    }

    return awarded.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      documentNumber: p.documentNumber,
      awardReason: p.awardReason,
      isAccredited: !!accMap[p.id],
      checkInTime: accMap[p.id] || null,
    }));
  }

  // Lista de personas (participantes e invitados) con requerimiento alimentario en el evento
  // del horario dado, con su estado de acreditación en ese horario.
  /**
   * Lista las personas (participantes e invitados) con requerimiento alimentario en el evento del
   * horario dado, con su estado de acreditación en ese horario.
   *
   * @param scheduleId - ID del horario cuyo evento se consulta y sobre el que se comprueba la acreditación.
   * @returns Arreglo de ítems (participantes e invitados) con su preferencia alimentaria e `isAccredited`.
   * @throws {Error} `'Schedule not found'` si el horario no existe.
   */
  async getDietaryList(scheduleId: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const eventId = (schedule as any).eventId;
    const notNone = { [Op.notIn]: ['NONE', ''], [Op.ne]: null } as any;

    const [participants, guests, accs] = await Promise.all([
      Participant.findAll({
        where: { eventId, dietaryPreference: notNone },
        attributes: ['id', 'firstName', 'lastName', 'documentNumber', 'dietaryPreference', 'dietaryComments'],
        order: [['lastName', 'ASC'], ['firstName', 'ASC']],
      }),
      Guest.findAll({
        where: { dietaryPreference: notNone },
        attributes: ['id', 'firstName', 'lastName', 'documentNumber', 'dietaryPreference'],
        include: [{ model: Participant, as: 'participant', where: { eventId }, attributes: ['id', 'firstName', 'lastName'] }],
      }),
      Accreditation.findAll({
        where: { eventScheduleId: scheduleId },
        attributes: ['participantId', 'guestId'],
        raw: true,
      }) as unknown as Array<{ participantId: string | null; guestId: string | null }>,
    ]);

    const accP = new Set(accs.filter((a) => a.participantId).map((a) => a.participantId));
    const accG = new Set(accs.filter((a) => a.guestId).map((a) => a.guestId));

    const items = [
      ...participants.map((p: any) => ({
        id: p.id,
        type: 'Participante' as const,
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        documentNumber: p.documentNumber || null,
        dietary: dietaryFull(p.dietaryPreference, p.dietaryComments),
        belongsTo: null as string | null,
        isAccredited: accP.has(p.id),
      })),
      ...guests.map((g: any) => ({
        id: g.id,
        type: 'Invitado' as const,
        name: `${g.firstName || ''} ${g.lastName || ''}`.trim(),
        documentNumber: g.documentNumber || null,
        dietary: dietaryLabel(g.dietaryPreference),
        belongsTo: g.participant ? `${g.participant.firstName || ''} ${g.participant.lastName || ''}`.trim() : null,
        isAccredited: accG.has(g.id),
      })),
    ];

    return items;
  }

  /**
   * Comprueba si un participante o invitado ya está acreditado en un horario. Puede participar en una
   * transacción externa (se usa dentro de `_verifyAndLock`).
   *
   * @param type - `'participant'` o `'guest'`, según a quién se consulta.
   * @param id - ID del participante o del invitado.
   * @param scheduleId - ID del horario a comprobar.
   * @param transaction - Transacción opcional en la que ejecutar la consulta.
   * @returns `{ isAccredited, accreditation }`: si está acreditado y la fila encontrada (o `null`).
   */
  async verifyAccreditation(type: 'participant' | 'guest', id: string, scheduleId: string, transaction?: Transaction) {
    const whereClause: any = { eventScheduleId: scheduleId };
    if (type === 'participant') {
        whereClause.participantId = id;
    } else {
        whereClause.guestId = id;
    }

    const accreditation = await Accreditation.findOne({ where: whereClause, transaction });
    
    return {
        isAccredited: !!accreditation,
        accreditation,
    };
  }
}

export const accreditationService = new AccreditationService();
