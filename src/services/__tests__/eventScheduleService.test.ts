import { EventScheduleService } from '../eventScheduleService';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import Accreditation from '@/models/Accreditation';
import AuditLog from '@/models/AuditLog';
import { Op } from 'sequelize';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const EventMock = Event as jest.Mocked<typeof Event>;
const ScheduleMock = EventSchedule as jest.Mocked<typeof EventSchedule>;
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const AuditLogMock = AuditLog as jest.Mocked<typeof AuditLog>;

const EVENT_ID = '123e4567-e89b-12d3-a456-426614174000';

// Fábrica de horario "instancia": update muta el objeto y get devuelve un snapshot plano
// (lo usa updateSchedule para el diff de auditoría con buildChanges).
const makeSchedule = (overrides: Record<string, any> = {}) => {
  const s: any = {
    id: 'sch-1',
    eventId: EVENT_ID,
    scheduleName: 'Fecha Uno',
    label: null,
    startDateTime: new Date('2026-10-01T10:00:00.000Z'),
    endDateTime: new Date('2026-10-01T12:00:00.000Z'),
    maxCapacity: 50,
    maxAttendees: 80,
    location: 'Sala A',
    blockType: 'SINGLE',
    status: 'published',
    imageUrl: null,
    ...overrides,
  };
  s.update = jest.fn(function (data: any) { Object.assign(s, data); return Promise.resolve(s); });
  s.get = jest.fn(function () {
    const { update, get, destroy, ...plain } = s;
    return { ...plain };
  });
  s.destroy = jest.fn().mockResolvedValue(undefined);
  return s;
};

describe('EventScheduleService', () => {
  let service: EventScheduleService;

  beforeEach(() => {
    service = new EventScheduleService();
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------- createSchedule
  describe('createSchedule', () => {
    const baseData = {
      eventId: EVENT_ID,
      scheduleName: 'Fecha Uno',
      startDateTime: '2026-10-01T10:00:00.000Z',
      endDateTime: '2026-10-01T12:00:00.000Z',
    };

    it('lanza error si el evento no existe', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.createSchedule(EVENT_ID, baseData as any)).rejects.toThrow(
        `Evento ${EVENT_ID} no encontrado para la agenda.`,
      );
    });

    it('lanza error si el cupo de la fecha supera al del evento', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });
      await expect(
        service.createSchedule(EVENT_ID, { ...baseData, maxCapacity: 200 } as any),
      ).rejects.toThrow('no puede superar el del evento');
    });

    it('lanza error si el aforo total es menor que el cupo de participantes', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });
      await expect(
        service.createSchedule(EVENT_ID, { ...baseData, maxCapacity: 50, maxAttendees: 30 } as any),
      ).rejects.toThrow('no puede ser menor que el cupo de participantes');
    });

    it('crea la fecha sin auditoría cuando no hay userId', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });
      const created = makeSchedule();
      (ScheduleMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createSchedule(EVENT_ID, { ...baseData, maxCapacity: 50, maxAttendees: 80 } as any);

      expect(ScheduleMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: EVENT_ID, scheduleName: 'Fecha Uno', maxCapacity: 50, maxAttendees: 80 }),
      );
      expect(AuditLogMock.create).not.toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('registra auditoría CREATE cuando hay userId', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });
      const created = makeSchedule({ id: 'sch-9', scheduleName: 'Fecha Nueve' });
      (ScheduleMock.create as jest.Mock).mockResolvedValue(created);

      await service.createSchedule(EVENT_ID, baseData as any, 'user-1');

      expect(AuditLogMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', action: 'CREATE', entity: 'EventSchedule', entityId: 'sch-9' }),
      );
    });
  });

  // ------------------------------------------------------------- updateSchedule
  describe('updateSchedule', () => {
    it('lanza error si el horario no existe', async () => {
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.updateSchedule('sch-1', { location: 'X' } as any)).rejects.toThrow('Schedule not found');
    });

    it('impide cambiar fechas si ya hay acreditaciones', async () => {
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(makeSchedule());
      (AccreditationMock.count as jest.Mock).mockResolvedValue(3);

      // Se reenvían AMBAS fechas (rango válido) como hace el formulario: se prueba el
      // bloqueo por acreditaciones, no la validez del rango.
      await expect(
        service.updateSchedule('sch-1', {
          startDateTime: '2026-10-05T10:00:00.000Z',
          endDateTime: '2026-10-05T12:00:00.000Z',
        } as any),
      ).rejects.toThrow('Cannot change dates of a schedule with existing accreditations.');
    });

    it('permite cambiar fechas si no hay acreditaciones', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);

      const result = await service.updateSchedule('sch-1', {
        startDateTime: '2026-10-05T10:00:00.000Z',
        endDateTime: '2026-10-05T12:00:00.000Z',
      } as any);

      expect(schedule.update).toHaveBeenCalled();
      expect(result).toBe(schedule);
    });

    it('lanza error si el nuevo cupo supera al del evento', async () => {
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(makeSchedule());
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });

      await expect(service.updateSchedule('sch-1', { maxCapacity: 200 } as any)).rejects.toThrow(
        'no puede superar el del evento',
      );
    });

    it('lanza error si el aforo total queda por debajo del cupo', async () => {
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(makeSchedule());
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });

      await expect(
        service.updateSchedule('sch-1', { maxCapacity: 50, maxAttendees: 30 } as any),
      ).rejects.toThrow('no puede ser menor que el cupo de participantes');
    });

    it('no permite mover la fecha a otro evento (eventId ignorado) y no audita sin cambios reales', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      // location igual al actual -> tras aplicar blockType (default), no hay cambios reales.
      const otherEventId = '123e4567-e89b-12d3-a456-426614174999';
      await service.updateSchedule('sch-1', { location: 'Sala A', eventId: otherEventId } as any, 'user-1');

      const updateArg = schedule.update.mock.calls[0][0];
      expect(updateArg).not.toHaveProperty('eventId');
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });

    it('actualiza y registra auditoría UPDATE con los cambios reales', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      const result = await service.updateSchedule('sch-1', { location: 'Sala B' } as any, 'user-1');

      expect(schedule.update).toHaveBeenCalledWith(expect.objectContaining({ location: 'Sala B' }));
      expect(AuditLogMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', action: 'UPDATE', entity: 'EventSchedule' }),
      );
      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.changes.location).toEqual({ from: 'Sala A', to: 'Sala B' });
      expect(result).toBe(schedule);
    });
  });

  // ------------------------------------------------------------- deleteSchedule
  describe('deleteSchedule', () => {
    it('lanza error si tiene acreditaciones', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(1);
      await expect(service.deleteSchedule('sch-1')).rejects.toThrow(
        'Cannot delete schedule with existing accreditations.',
      );
    });

    it('lanza error si el horario no existe', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteSchedule('sch-1')).rejects.toThrow('Schedule not found');
    });

    it('elimina el horario y devuelve el mensaje (sin userId, sin auditoría)', async () => {
      const schedule = makeSchedule();
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      const result = await service.deleteSchedule('sch-1');

      expect(schedule.destroy).toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Schedule deleted successfully' });
    });

    it('registra auditoría DELETE con la razón cuando hay userId', async () => {
      const schedule = makeSchedule();
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.deleteSchedule('sch-1', 'user-1', 'duplicada');

      expect(AuditLogMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1', action: 'DELETE', entity: 'EventSchedule', entityId: 'sch-1',
          details: expect.objectContaining({ reason: 'duplicada' }),
        }),
      );
    });
  });

  // ---------------------------------------------------------- getSchedulesByEvent
  describe('getSchedulesByEvent', () => {
    it('consulta las fechas del evento con el conteo de acreditados', async () => {
      const rows = [{ id: 'sch-1' }];
      (ScheduleMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.getSchedulesByEvent(EVENT_ID);

      expect(ScheduleMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: EVENT_ID }, order: [['startDateTime', 'ASC']] }),
      );
      expect(result).toBe(rows);
    });
  });

  // ----------------------------------------------------------- getActiveSchedules
  describe('getActiveSchedules', () => {
    it('consulta las fechas activas (acreditando o publicadas de hoy)', async () => {
      const rows = [{ id: 'sch-1' }];
      (ScheduleMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.getActiveSchedules();

      expect(ScheduleMock.findAll).toHaveBeenCalledTimes(1);
      const arg: any = (ScheduleMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where.isActive).toBe(true);
      expect(arg.where[Op.or]).toEqual(expect.any(Array));
      expect(result).toBe(rows);
    });
  });

  // -------------------------------------------------------------------- setStatus
  describe('setStatus', () => {
    it('lanza error con un estado inválido', async () => {
      await expect(service.setStatus('sch-1', 'invalid')).rejects.toThrow('Estado de horario inválido');
    });

    it('lanza error si el horario no existe', async () => {
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.setStatus('sch-1', 'accrediting')).rejects.toThrow('Schedule not found');
    });

    it('cambia el estado y audita el cambio (from !== to)', async () => {
      const schedule = makeSchedule({ status: 'published' });
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      const result = await service.setStatus('sch-1', 'accrediting', 'user-1');

      expect(schedule.update).toHaveBeenCalledWith({ status: 'accrediting' });
      expect(AuditLogMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entity: 'EventSchedule' }),
      );
      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.changes.status).toEqual({ from: 'published', to: 'accrediting' });
      expect(result).toBe(schedule);
    });

    it('no audita si el estado no cambia', async () => {
      const schedule = makeSchedule({ status: 'accrediting' });
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.setStatus('sch-1', 'accrediting', 'user-1');

      expect(schedule.update).toHaveBeenCalledWith({ status: 'accrediting' });
      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });

    it('no audita si no hay userId', async () => {
      const schedule = makeSchedule({ status: 'published' });
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.setStatus('sch-1', 'cancelled');

      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------- setImage
  describe('setImage', () => {
    it('lanza error si el horario no existe', async () => {
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.setImage('sch-1', 'http://img')).rejects.toThrow('Schedule not found');
    });

    it('asigna la imagen y audita "actualizada"', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.setImage('sch-1', 'http://img/x.png', 'user-1');

      expect(schedule.update).toHaveBeenCalledWith({ imageUrl: 'http://img/x.png' });
      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.changes.imagen).toBe('actualizada');
    });

    it('quita la imagen (null) y audita "quitada"', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.setImage('sch-1', null, 'user-1');

      expect(schedule.update).toHaveBeenCalledWith({ imageUrl: null });
      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.changes.imagen).toBe('quitada');
    });

    it('no audita sin userId', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.setImage('sch-1', 'http://img/x.png');

      expect(AuditLogMock.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------- searchSchedules
  describe('searchSchedules', () => {
    it('filtra por nombre (iLike)', async () => {
      (ScheduleMock.findAll as jest.Mock).mockResolvedValue([]);

      await service.searchSchedules({ name: 'gala' });

      const arg: any = (ScheduleMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where.scheduleName).toEqual({ [Op.iLike]: '%gala%' });
      expect(arg.limit).toBe(50);
    });

    it('filtra por rango de fechas (between)', async () => {
      (ScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
      const start = new Date('2026-10-01');
      const end = new Date('2026-10-31');

      await service.searchSchedules({ startDate: start, endDate: end });

      const arg: any = (ScheduleMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where.startDateTime).toEqual({ [Op.between]: [start, end] });
    });

    it('filtra por fecha de inicio (gte) cuando falta la de término', async () => {
      (ScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
      const start = new Date('2026-10-01');

      await service.searchSchedules({ startDate: start });

      const arg: any = (ScheduleMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where.startDateTime).toEqual({ [Op.gte]: start });
    });

    it('sin filtros usa un where vacío y devuelve los resultados', async () => {
      const rows = [{ id: 'sch-1' }];
      (ScheduleMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.searchSchedules({});

      const arg: any = (ScheduleMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where).toEqual({});
      expect(result).toBe(rows);
    });
  });

  // -------------------------------------------------- Cobertura adicional ramas
  describe('cobertura adicional de ramas', () => {
    const baseData = {
      eventId: EVENT_ID,
      scheduleName: 'Fecha Uno',
      startDateTime: '2026-10-01T10:00:00.000Z',
      endDateTime: '2026-10-01T12:00:00.000Z',
    };

    it('createSchedule permite el cupo cuando el evento no define maxCapacity', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: null });
      const created = makeSchedule();
      (ScheduleMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createSchedule(EVENT_ID, { ...baseData, maxCapacity: 50 } as any);

      expect(ScheduleMock.create).toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('updateSchedule permite cambiar solo la fecha de término sin acreditaciones', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);

      await service.updateSchedule('sch-1', { endDateTime: '2026-10-01T15:00:00.000Z' } as any);

      expect(AccreditationMock.count).toHaveBeenCalled();
      expect(schedule.update).toHaveBeenCalled();
    });

    it('updateSchedule acepta maxCapacity dentro del límite del evento', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxCapacity: 100 });

      await service.updateSchedule('sch-1', { maxCapacity: 40 } as any);

      expect(schedule.update).toHaveBeenCalledWith(expect.objectContaining({ maxCapacity: 40 }));
    });

    it('updateSchedule valida el aforo usando el cupo existente cuando solo cambia maxAttendees', async () => {
      const schedule = makeSchedule({ maxCapacity: 50, maxAttendees: 80 });
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.updateSchedule('sch-1', { maxAttendees: 90 } as any);

      expect(schedule.update).toHaveBeenCalledWith(expect.objectContaining({ maxAttendees: 90 }));
    });

    it('updateSchedule no revienta si el evento asociado ya no existe al validar el cupo', async () => {
      const schedule = makeSchedule();
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null); // evento borrado -> evMax 0

      await service.updateSchedule('sch-1', { maxCapacity: 40 } as any);

      expect(schedule.update).toHaveBeenCalledWith(expect.objectContaining({ maxCapacity: 40 }));
    });

    it('deleteSchedule audita con reason null cuando no se pasa razón', async () => {
      const schedule = makeSchedule();
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ScheduleMock.findByPk as jest.Mock).mockResolvedValue(schedule);

      await service.deleteSchedule('sch-1', 'user-1');

      const details: any = (AuditLogMock.create as jest.Mock).mock.calls[0][0].details;
      expect(details.reason).toBeNull();
    });
  });
});
