/**
 * Servicio de fechas/horarios de un evento (EventSchedule).
 *
 * Responsable del CRUD de horarios y de su ciclo de estado (published, accrediting, accredited,
 * cancelled), aplicando las reglas de cupo y aforo: el cupo de participantes de una fecha no
 * puede superar el del evento y el aforo total no puede ser menor que ese cupo. Protege los
 * horarios con acreditaciones (no se les cambia la fecha ni se eliminan). Toda operación de
 * escritura registra auditoría.
 */
import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { Event, EventSchedule, Accreditation } from '@/models/index';
import { createScheduleSchema, updateScheduleSchema } from '@/utils/validators/eventSchemas';
import { auditLogService } from './auditLogService';

/** Nombre legible de una fecha (`label` o, en su defecto, `scheduleName`) para la auditoría. */
const scheduleName = (s: any) => s.label || s.scheduleName;

/**
 * Lógica de negocio para crear, editar, eliminar, consultar y cambiar el estado de las fechas
 * de un evento, validando cupo/aforo y respetando los horarios que ya tienen acreditaciones.
 */
export class EventScheduleService {
  /**
   * Valida y crea una fecha/horario de un evento, comprobando que el cupo de la fecha no supere el
   * del evento y que el aforo total no sea menor que el cupo de participantes. Se permiten horarios
   * solapados (sesiones paralelas en distintas salas).
   *
   * @param eventId - ID del evento al que pertenece la fecha (se fija desde la ruta).
   * @param data - Datos de la fecha; se validan con `createScheduleSchema`.
   * @param userId - ID del usuario que crea; si viene, se registra en auditoría (acción `CREATE`).
   * @returns La fecha (`EventSchedule`) creada.
   * @throws {z.ZodError} Si `data` no cumple `createScheduleSchema`.
   * @throws {Error} `'Evento <id> no encontrado para la agenda.'` si el evento no existe.
   * @throws {Error} `'El cupo de participantes de la fecha (N) no puede superar el del evento (M).'` si el cupo de la fecha supera el del evento.
   * @throws {Error} `'El aforo total (N) no puede ser menor que el cupo de participantes (M).'` si el aforo total es menor que el cupo.
   */
  async createSchedule(eventId: string, data: z.infer<typeof createScheduleSchema>, userId?: string) {
    const validatedData = createScheduleSchema.parse(data);
    const event = await Event.findByPk(eventId);
    if (!event) {
      throw new Error(`Evento ${eventId} no encontrado para la agenda.`);
    }

    // El cupo de participantes de una fecha no puede superar el del evento.
    const evMax = Number((event as any).maxCapacity) || 0;
    const sMax = Number((validatedData as any).maxCapacity) || 0;
    if (evMax > 0 && sMax > evMax) {
      throw new Error(`El cupo de participantes de la fecha (${sMax}) no puede superar el del evento (${evMax}).`);
    }
    // El aforo total (participantes + invitados) no puede ser menor que el cupo de participantes.
    const sAforo = Number((validatedData as any).maxAttendees) || 0;
    if (sMax > 0 && sAforo > 0 && sAforo < sMax) {
      throw new Error(`El aforo total (${sAforo}) no puede ser menor que el cupo de participantes (${sMax}).`);
    }

    // Nota: se permiten horarios que se solapan (ej. sesiones paralelas en distintas salas).
    const schedule = await EventSchedule.create({ ...validatedData, eventId });
    if (userId) {
      await auditLogService.log({ userId, action: 'CREATE', entity: 'EventSchedule', entityId: schedule.id, details: { name: scheduleName(schedule) } });
    }
    return schedule;
  }

  /**
   * Valida y actualiza una fecha. Comprueba con los valores EFECTIVOS que el término sea posterior
   * al inicio; impide cambiar las fechas si ya existen acreditaciones; y revalida cupo/aforo. El
   * `eventId` nunca se cambia por edición.
   *
   * @param scheduleId - ID de la fecha a actualizar.
   * @param data - Campos a modificar; se validan con `updateScheduleSchema`.
   * @param userId - ID del usuario que edita; si viene y hubo cambios reales, se registra en auditoría (acción `UPDATE`).
   * @returns La fecha (`EventSchedule`) actualizada.
   * @throws {z.ZodError} Si `data` no cumple `updateScheduleSchema`.
   * @throws {Error} `'Schedule not found'` si la fecha no existe.
   * @throws {Error} `'La fecha y hora de término debe ser posterior a la de inicio.'` si el término no es posterior al inicio.
   * @throws {Error} `'Cannot change dates of a schedule with existing accreditations.'` si se intenta cambiar la fecha teniendo acreditaciones.
   * @throws {Error} `'El cupo de participantes de la fecha (N) no puede superar el del evento (M).'` si el cupo supera el del evento.
   * @throws {Error} `'El aforo total (N) no puede ser menor que el cupo de participantes (M).'` si el aforo es menor que el cupo.
   */
  async updateSchedule(scheduleId: string, data: z.infer<typeof updateScheduleSchema>, userId?: string) {
    const validatedData = updateScheduleSchema.parse(data);
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // La fecha y hora de término debe ser posterior a la de inicio. updateScheduleSchema
    // no puede validarlo (el .partial() descarta el .refine() del base y además puede
    // venir una sola de las dos fechas), así que se valida con los valores EFECTIVOS:
    // lo que trae la edición o, si no, lo que ya tiene la fecha.
    const effStart = new Date((validatedData.startDateTime ?? (schedule as any).startDateTime) as any);
    const effEnd = new Date((validatedData.endDateTime ?? (schedule as any).endDateTime) as any);
    if (!isNaN(effStart.getTime()) && !isNaN(effEnd.getTime()) && effEnd <= effStart) {
      throw new Error('La fecha y hora de término debe ser posterior a la de inicio.');
    }

    // Solo se bloquea si las fechas CAMBIAN de verdad (el formulario reenvía siempre
    // start/endDateTime, así que comparar por presencia impedía editar cualquier otro
    // campo —cupo, aforo, ubicación— de un horario con acreditaciones).
    const sameTime = (a: any, b: any) => a != null && b != null && new Date(a).getTime() === new Date(b).getTime();
    const changingStart = validatedData.startDateTime != null && !sameTime(validatedData.startDateTime, (schedule as any).startDateTime);
    const changingEnd = validatedData.endDateTime != null && !sameTime(validatedData.endDateTime, (schedule as any).endDateTime);
    if (changingStart || changingEnd) {
        const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId }});
        if (accreditedCount > 0) {
            throw new Error('Cannot change dates of a schedule with existing accreditations.');
        }
    }

    // El cupo de participantes de una fecha no puede superar el del evento.
    if (validatedData.maxCapacity != null) {
        const event = await Event.findByPk((schedule as any).eventId);
        const evMax = Number((event as any)?.maxCapacity) || 0;
        const sMax = Number(validatedData.maxCapacity) || 0;
        if (evMax > 0 && sMax > evMax) {
            throw new Error(`El cupo de participantes de la fecha (${sMax}) no puede superar el del evento (${evMax}).`);
        }
    }
    // El aforo total no puede ser menor que el cupo de participantes (usando los valores
    // efectivos: lo que trae la edición, o lo que ya tiene la fecha).
    if (validatedData.maxCapacity != null || (validatedData as any).maxAttendees != null) {
        const cap = Number(validatedData.maxCapacity ?? (schedule as any).maxCapacity) || 0;
        const aforo = Number((validatedData as any).maxAttendees ?? (schedule as any).maxAttendees) || 0;
        if (cap > 0 && aforo > 0 && aforo < cap) {
            throw new Error(`El aforo total (${aforo}) no puede ser menor que el cupo de participantes (${cap}).`);
        }
    }

    // `eventId` no se cambia por edición (mass-assignment): una fecha no se mueve a
    // otro evento. El create sí lo fija desde la ruta.
    const { eventId: _ignoredEventId, ...rest } = validatedData as any;
    const before: any = JSON.parse(JSON.stringify(schedule.get({ plain: true })));
    await schedule.update(rest);
    if (userId) {
      const changes = auditLogService.buildChanges(before, schedule.get({ plain: true }), Object.keys(rest));
      if (Object.keys(changes).length) {
        await auditLogService.log({ userId, action: 'UPDATE', entity: 'EventSchedule', entityId: schedule.id, details: { name: scheduleName(schedule), changes } });
      }
    }
    return schedule;
  }

  /**
   * Elimina una fecha, siempre que no tenga acreditaciones (borrado real). Registra la eliminación.
   *
   * @param scheduleId - ID de la fecha a eliminar.
   * @param userId - ID del usuario que elimina; si viene, se registra en auditoría (acción `DELETE`).
   * @param reason - Motivo opcional de la eliminación (queda en el detalle de auditoría).
   * @returns Objeto `{ message: 'Schedule deleted successfully' }`.
   * @throws {Error} `'Cannot delete schedule with existing accreditations.'` si la fecha tiene acreditaciones.
   * @throws {Error} `'Schedule not found'` si la fecha no existe.
   */
  async deleteSchedule(scheduleId: string, userId?: string, reason?: string) {
    const accreditedCount = await Accreditation.count({ where: { eventScheduleId: scheduleId } });
    if (accreditedCount > 0) {
      throw new Error('Cannot delete schedule with existing accreditations.');
    }
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    const name = scheduleName(schedule);
    await schedule.destroy();
    if (userId) {
      await auditLogService.log({ userId, action: 'DELETE', entity: 'EventSchedule', entityId: scheduleId, details: { name, reason: reason || null } });
    }
    return { message: 'Schedule deleted successfully' };
  }

  /**
   * Lista las fechas de un evento con el número de acreditados de cada una y datos del evento
   * (ubicación y cupo), ordenadas por fecha de inicio ascendente.
   *
   * @param eventId - ID del evento cuyas fechas se listan.
   * @returns Arreglo de fechas (`EventSchedule`) con el agregado `accreditedCount`.
   */
  async getSchedulesByEvent(eventId: string) {
    const schedules = await EventSchedule.findAll({
      where: { eventId },
      include: [
        {
          model: Accreditation,
          attributes: [],
        },
        {
          model: Event,
          attributes: ['location', 'maxCapacity'],
        }
      ],
      attributes: {
        include: [[fn('COUNT', col('Accreditations.id')), 'accreditedCount']],
      },
      group: ['EventSchedule.id', 'Event.id'],
      order: [['startDateTime', 'ASC']],
    });
    return schedules;
  }

  // Horarios relevantes para acreditar (cross-evento): los que están EN acreditación ahora,
  // más los publicados de HOY (para abrirlos/prepararlos). Incluye evento y nº de acreditados.
  /**
   * Devuelve las fechas relevantes para acreditar (cross-evento): las que están EN acreditación
   * ahora (`accrediting`) más las publicadas cuyo inicio es HOY. Incluye el evento y el número de
   * acreditados, ordenadas por inicio ascendente.
   *
   * @returns Arreglo de fechas activas (`EventSchedule`) con `accreditedCount` y su evento.
   */
  async getActiveSchedules() {
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);

    return EventSchedule.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { status: 'accrediting' },
          { status: 'published', startDateTime: { [Op.between]: [startToday, endToday] } },
        ],
      },
      include: [
        { model: Accreditation, attributes: [] },
        { model: Event, attributes: ['id', 'name', 'location', 'maxCapacity'] },
      ],
      attributes: {
        include: [[fn('COUNT', col('Accreditations.id')), 'accreditedCount']],
      },
      group: ['EventSchedule.id', 'Event.id'],
      order: [['startDateTime', 'ASC']],
    });
  }

  // Abrir/cerrar acreditación a mano (published|accrediting|accredited|cancelled).
  /**
   * Cambia manualmente el estado de una fecha (abrir/cerrar acreditación). Solo registra auditoría
   * si el estado cambió realmente.
   *
   * @param scheduleId - ID de la fecha cuyo estado se cambia.
   * @param status - Nuevo estado; debe ser uno de `published | accrediting | accredited | cancelled`.
   * @param userId - ID del usuario que cambia el estado; si viene y hubo cambio, se registra en auditoría (acción `UPDATE`).
   * @returns La fecha (`EventSchedule`) con el nuevo estado.
   * @throws {Error} `'Estado de horario inválido'` si `status` no es uno de los permitidos.
   * @throws {Error} `'Schedule not found'` si la fecha no existe.
   */
  async setStatus(scheduleId: string, status: string, userId?: string) {
    const allowed = ['published', 'accrediting', 'accredited', 'cancelled'];
    if (!allowed.includes(status)) throw new Error('Estado de horario inválido');
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const from = (schedule as any).status;
    await schedule.update({ status });
    if (userId && from !== status) {
      await auditLogService.log({
        userId,
        action: 'UPDATE',
        entity: 'EventSchedule',
        entityId: schedule.id,
        details: { name: scheduleName(schedule), changes: { status: { from, to: status } } },
      });
    }
    return schedule;
  }

  // Asignar/quitar la imagen de un horario (solo el campo imageUrl, sin tocar fechas).
  /**
   * Asigna o quita la imagen de una fecha (solo el campo `imageUrl`, sin tocar las fechas).
   *
   * @param scheduleId - ID de la fecha a modificar.
   * @param imageUrl - URL de la imagen, o `null`/cadena vacía para quitarla.
   * @param userId - ID del usuario que modifica; si viene, se registra en auditoría (acción `UPDATE`).
   * @returns La fecha (`EventSchedule`) actualizada.
   * @throws {Error} `'Schedule not found'` si la fecha no existe.
   */
  async setImage(scheduleId: string, imageUrl: string | null, userId?: string) {
    const schedule = await EventSchedule.findByPk(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    await schedule.update({ imageUrl: imageUrl || null });
    if (userId) {
      await auditLogService.log({
        userId,
        action: 'UPDATE',
        entity: 'EventSchedule',
        entityId: schedule.id,
        details: { name: scheduleName(schedule), changes: { imagen: imageUrl ? 'actualizada' : 'quitada' } },
      });
    }
    return schedule;
  }

  /**
   * Busca fechas por nombre (iLike) y/o rango sobre la fecha de inicio, incluyendo el nombre del
   * evento, ordenadas por inicio ascendente y limitadas a 50 resultados.
   *
   * @param query - Filtros: `name` (coincidencia parcial), `startDate` y `endDate` (rango sobre `startDateTime`).
   * @returns Arreglo de hasta 50 fechas (`EventSchedule`) que cumplen el filtro.
   */
  async searchSchedules(query: { name?: string, startDate?: Date, endDate?: Date }) {
    const where: any = {};
    
    if (query.name) {
      where.scheduleName = { [Op.iLike]: `%${query.name}%` };
    }

    if (query.startDate && query.endDate) {
        where.startDateTime = {
            [Op.between]: [query.startDate, query.endDate]
        };
    } else if (query.startDate) {
        where.startDateTime = { [Op.gte]: query.startDate };
    }

    return await EventSchedule.findAll({
      where,
      include: [{ model: Event, attributes: ['name'] }],
      order: [['startDateTime', 'ASC']],
      limit: 50
    });
  }
}

export const eventScheduleService = new EventScheduleService();
