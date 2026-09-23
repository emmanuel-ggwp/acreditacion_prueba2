import { Op } from 'sequelize';
import { ParticipantService } from '../participantService';
import { sequelize } from '@/lib/sequelize';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import ParticipantSchedule from '@/models/ParticipantSchedule';
import GuestSchedule from '@/models/GuestSchedule';
import Accreditation from '@/models/Accreditation';
import AuditLog from '@/models/AuditLog';

// Los modelos y @/lib/sequelize ya están mockeados globalmente por jest.setup.js.
// Aquí solo los tipamos como mocks y configuramos su retorno por test.
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const GuestMock = Guest as jest.Mocked<typeof Guest>;
const EventMock = Event as jest.Mocked<typeof Event>;
const EventScheduleMock = EventSchedule as jest.Mocked<typeof EventSchedule>;
const ParticipantScheduleMock = ParticipantSchedule as jest.Mocked<typeof ParticipantSchedule>;
const GuestScheduleMock = GuestSchedule as jest.Mocked<typeof GuestSchedule>;
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const AuditLogMock = AuditLog as jest.Mocked<typeof AuditLog>;

// UUIDs válidos (los esquemas Zod los exigen para scheduleIds, etc.).
const EVENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const SCHEDULE_ID_1 = '123e4567-e89b-12d3-a456-426614174001';
const SCHEDULE_ID_2 = '123e4567-e89b-12d3-a456-426614174002';
const PARTICIPANT_ID = '123e4567-e89b-12d3-a456-426614174003';
const PARTICIPANT_ID_2 = '123e4567-e89b-12d3-a456-426614174004';
const USER_ID = '123e4567-e89b-12d3-a456-426614174010';

// RUT chileno válido (11.111.111-1) e inválido (dígito verificador incorrecto).
const VALID_RUT = '11111111-1';
const INVALID_RUT = '12345678-9';

// Crea una tx manual observable (commit/rollback como jest.fn).
const makeTx = () => ({
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  LOCK: { UPDATE: 'UPDATE' },
});

describe('ParticipantService', () => {
  let service: ParticipantService;

  beforeEach(() => {
    service = new ParticipantService();
    jest.clearAllMocks();

    // Mock de transaction que soporta forma manual (await transaction()) y callback.
    (sequelize.transaction as jest.Mock).mockImplementation(async (a: any, b?: any) => {
      const t = makeTx();
      const cb = typeof a === 'function' ? a : typeof b === 'function' ? b : undefined;
      if (cb) {
        const parent = a && typeof a === 'object' && a.transaction ? a.transaction : t;
        return cb(parent);
      }
      return t;
    });

    // findOrCreate no viene en la fábrica global; el servicio lo usa en importParticipants.
    (ParticipantScheduleMock as any).findOrCreate = jest.fn().mockResolvedValue([{}, true]);
  });

  // ------------------------------------------------------------------
  // createParticipant
  // ------------------------------------------------------------------
  describe('createParticipant', () => {
    it('crea un participante determinando el evento por scheduleIds y lo inscribe', async () => {
      const event = { id: EVENT_ID, maxGuestsPerParticipant: 5 };
      const schedules = [{ id: SCHEDULE_ID_1, Event: event }];
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue(schedules);
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      const created = { id: PARTICIPANT_ID, firstName: 'John', lastName: 'Doe', email: 'john@example.com', addSchedules: jest.fn() };
      (ParticipantMock.create as jest.Mock).mockResolvedValue(created);

      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', scheduleIds: [SCHEDULE_ID_1] };
      const result = await service.createParticipant(data as any, USER_ID);

      expect(EventScheduleMock.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { id: [SCHEDULE_ID_1] } }));
      expect(ParticipantMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'John', eventId: EVENT_ID, createdBy: USER_ID })
      );
      expect(created.addSchedules).toHaveBeenCalledWith(schedules);
      expect(AuditLogMock.create).toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('crea un participante precargado usando eventId explícito (sin horarios)', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 0 });
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      const created = { id: PARTICIPANT_ID, firstName: 'Ann', lastName: 'Smith', email: 'ann@example.com', addSchedules: jest.fn() };
      (ParticipantMock.create as jest.Mock).mockResolvedValue(created);

      const data = { firstName: 'Ann', lastName: 'Smith', email: 'ann@example.com', eventId: EVENT_ID };
      const result = await service.createParticipant(data as any, USER_ID);

      expect(EventMock.findByPk).toHaveBeenCalledWith(EVENT_ID);
      expect(ParticipantMock.create).toHaveBeenCalled();
      expect(created.addSchedules).not.toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('reutiliza un participante existente en el mismo evento (no vuelve a crear)', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 0 });
      const existing = { id: PARTICIPANT_ID, firstName: 'Dup', lastName: 'User', email: 'dup@example.com' };
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(existing);

      const data = { firstName: 'Dup', lastName: 'User', email: 'dup@example.com', eventId: EVENT_ID };
      const result = await service.createParticipant(data as any, USER_ID);

      expect(ParticipantMock.create).not.toHaveBeenCalled();
      expect(AuditLogMock.create).not.toHaveBeenCalled(); // solo se audita al crear
      expect(result).toBe(existing);
    });

    it('lanza error si uno o más horarios no existen', async () => {
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]); // ninguno encontrado
      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', scheduleIds: [SCHEDULE_ID_1] };
      await expect(service.createParticipant(data as any, USER_ID)).rejects.toThrow('One or more schedules not found');
    });

    it('lanza error si no hay evento ni horario', async () => {
      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      await expect(service.createParticipant(data as any, USER_ID)).rejects.toThrow(
        'Se requiere el evento (eventId) o al menos un horario.'
      );
    });

    it('lanza error si los invitados permitidos superan el máximo del evento', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 5 });
      const data = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', eventId: EVENT_ID, allowedGuests: 10 };
      await expect(service.createParticipant(data as any, USER_ID)).rejects.toThrow(
        'Number of allowed guests exceeds the event limit of 5'
      );
    });

    it('rechaza datos inválidos (ZodError)', async () => {
      const data = { firstName: 'J', lastName: 'Doe', email: 'not-an-email' };
      await expect(service.createParticipant(data as any, USER_ID)).rejects.toThrow();
      expect(ParticipantMock.create).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // bulkCreateParticipants
  // ------------------------------------------------------------------
  describe('bulkCreateParticipants', () => {
    const validRow = (over: any = {}) => ({ firstName: 'Bulk', lastName: 'User', email: 'bulk@example.com', ...over });

    it('lanza error si el evento no existe', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.bulkCreateParticipants([validRow()] as any, EVENT_ID, USER_ID)).rejects.toThrow('Event not found');
    });

    it('lanza error si el evento no tiene horarios activos', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 0 });
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
      await expect(service.bulkCreateParticipants([validRow()] as any, EVENT_ID, USER_ID)).rejects.toThrow(
        'No active schedules found for this event to assign participants to.'
      );
    });

    it('crea participantes y los inscribe en los horarios activos', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 0 });
      const schedules = [{ id: SCHEDULE_ID_1, isActive: true }];
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue(schedules);
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      const created = { id: PARTICIPANT_ID, addSchedules: jest.fn() };
      (ParticipantMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.bulkCreateParticipants(
        [validRow({ email: 'a@example.com' }), validRow({ email: 'b@example.com' })] as any,
        EVENT_ID,
        USER_ID
      );

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(ParticipantMock.create).toHaveBeenCalledTimes(2);
      expect(created.addSchedules).toHaveBeenCalledWith(schedules, expect.any(Object));
    });

    it('reutiliza un participante existente sin contarlo como creado', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 0 });
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([{ id: SCHEDULE_ID_1, isActive: true }]);
      const existing = { id: PARTICIPANT_ID, addSchedules: jest.fn() };
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(existing);

      const result = await service.bulkCreateParticipants([validRow()] as any, EVENT_ID, USER_ID);

      expect(result.created).toBe(0);
      expect(ParticipantMock.create).not.toHaveBeenCalled();
      expect(existing.addSchedules).toHaveBeenCalled();
    });

    it('captura por fila el error de exceso de invitados y continúa', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, maxGuestsPerParticipant: 2 });
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([{ id: SCHEDULE_ID_1, isActive: true }]);

      const result = await service.bulkCreateParticipants([validRow({ allowedGuests: 5 })] as any, EVENT_ID, USER_ID);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('exceeds the event limit');
    });
  });

  // ------------------------------------------------------------------
  // importParticipants
  // ------------------------------------------------------------------
  describe('importParticipants', () => {
    const scheduleObj = { id: SCHEDULE_ID_1, scheduleName: 'Fecha 1', startDateTime: '2026-01-15T10:00:00Z', location: 'Sala A' };

    beforeEach(() => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue({ id: EVENT_ID, name: 'Evento Test' });
    });

    it('lanza error si el evento no existe', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.importParticipants(EVENT_ID, null, [], USER_ID)).rejects.toThrow('Event not found');
    });

    it('lanza error si el horario indicado no pertenece al evento', async () => {
      (EventScheduleMock.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.importParticipants(EVENT_ID, SCHEDULE_ID_1, [], USER_ID)).rejects.toThrow(
        'Schedule not found for this event'
      );
    });

    it('crea un participante nuevo con su invitado e inscribe en la fecha', async () => {
      (EventScheduleMock.findOne as jest.Mock).mockResolvedValue(scheduleObj);
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantMock.create as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID });
      (GuestMock.findOne as jest.Mock).mockResolvedValue(null); // sin duplicado
      (GuestMock.create as jest.Mock).mockResolvedValue({ id: 'g1' });

      const rows = [{ documentNumber: VALID_RUT, firstName: 'John', lastName: 'Doe', email: 'j@x.com', guests: [{ firstName: 'Guest One' }] }];
      const result = await service.importParticipants(EVENT_ID, SCHEDULE_ID_1, rows, USER_ID);

      expect(result.created).toBe(1);
      expect(result.guestsCreated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect((ParticipantScheduleMock as any).findOrCreate).toHaveBeenCalled();
      expect(GuestMock.create).toHaveBeenCalled();
      expect(AuditLogMock.create).toHaveBeenCalled();
    });

    it('rechaza una fila con RUT inválido', async () => {
      const rows = [{ documentNumber: INVALID_RUT, firstName: 'Bad', lastName: 'Rut' }];
      const result = await service.importParticipants(EVENT_ID, null, rows, USER_ID);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('RUT inválido');
    });

    it('rechaza una fila sin RUT y sin nombre', async () => {
      const rows = [{ documentNumber: '', firstName: '', lastName: '' }];
      const result = await service.importParticipants(EVENT_ID, null, rows, USER_ID);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('se necesita al menos uno');
    });

    it('sobrescribe el nombre de un participante existente (overwriteNames)', async () => {
      const existing = { id: PARTICIPANT_ID, firstName: 'Old', lastName: 'Name', isAwarded: false, update: jest.fn() };
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(existing);
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);

      const rows = [{ documentNumber: VALID_RUT, firstName: 'New', lastName: 'Name' }];
      const result = await service.importParticipants(EVENT_ID, null, rows, USER_ID, { overwriteNames: true });

      expect(result.reused).toBe(1);
      expect(result.namesUpdated).toBe(1);
      expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'New' }), expect.any(Object));
    });

    it('protege el nombre de un participante ya premiado (no lo toca)', async () => {
      const existing = { id: PARTICIPANT_ID, firstName: 'Old', lastName: 'Name', isAwarded: true, update: jest.fn() };
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(existing);

      const rows = [{ documentNumber: VALID_RUT, firstName: 'New', lastName: 'Name' }];
      const result = await service.importParticipants(EVENT_ID, null, rows, USER_ID, { overwriteNames: true });

      expect(result.namesProtected).toBe(1);
      expect(result.namesUpdated).toBe(0);
      expect(existing.update).not.toHaveBeenCalled();
    });

    it('descarta nombres de invitado basura ("Si")', async () => {
      (EventScheduleMock.findOne as jest.Mock).mockResolvedValue(scheduleObj);
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantMock.create as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID });

      const rows = [{ documentNumber: VALID_RUT, firstName: 'John', lastName: 'Doe', guests: [{ firstName: 'Si' }] }];
      const result = await service.importParticipants(EVENT_ID, SCHEDULE_ID_1, rows, USER_ID);

      expect(result.guestsDiscarded).toBe(1);
      expect(result.guestsCreated).toBe(0);
      expect(GuestMock.create).not.toHaveBeenCalled();
    });

    it('no duplica un invitado que ya existe con el mismo nombre', async () => {
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantMock.create as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID });
      (GuestMock.findOne as jest.Mock).mockResolvedValue({ id: 'existing-guest' }); // duplicado

      const rows = [{ documentNumber: VALID_RUT, firstName: 'John', lastName: 'Doe', guests: [{ firstName: 'Guest One' }] }];
      const result = await service.importParticipants(EVENT_ID, null, rows, USER_ID);

      expect(result.guestsCreated).toBe(0);
      expect(GuestMock.create).not.toHaveBeenCalled();
    });

    it('crea sin llave de dedup cuando la fila no trae RUT ni correo (solo nombre)', async () => {
      (ParticipantMock.create as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID });

      const rows = [{ firstName: 'John', lastName: 'Doe' }]; // sin documentNumber ni email
      const result = await service.importParticipants(EVENT_ID, null, rows, USER_ID);

      expect(ParticipantMock.findOne).not.toHaveBeenCalled(); // no hay condiciones de dedup
      expect(ParticipantMock.create).toHaveBeenCalled();
      expect(result.created).toBe(1);
    });

    it('calcula guestCount desde acompañante + cargas (modo numérico)', async () => {
      (ParticipantMock.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantMock.create as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID });

      const rows = [{ documentNumber: VALID_RUT, firstName: 'John', lastName: 'Doe', guestCompanion: 'si', guestLoads: 2 }];
      await service.importParticipants(EVENT_ID, null, rows, USER_ID);

      expect(ParticipantMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ guestCount: 3, guestCompanion: true, guestLoads: 2 }),
        expect.any(Object)
      );
    });
  });

  // ------------------------------------------------------------------
  // updateParticipant
  // ------------------------------------------------------------------
  describe('updateParticipant', () => {
    const makeParticipant = (over: any = {}) => ({
      id: PARTICIPANT_ID,
      eventId: EVENT_ID,
      firstName: 'Old',
      lastName: 'Doe',
      ...over,
      get: jest.fn(function (this: any) {
        return { id: this.id, eventId: this.eventId, firstName: this.firstName, lastName: this.lastName };
      }),
      update: jest.fn(function (this: any, d: any) {
        Object.assign(this, d);
        return Promise.resolve(this);
      }),
      setSchedules: jest.fn().mockResolvedValue(undefined),
    });

    it('lanza error si el participante no existe', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.updateParticipant(PARTICIPANT_ID, { firstName: 'New' } as any, USER_ID)).rejects.toThrow(
        'Participant not found'
      );
    });

    it('actualiza campos básicos y registra el cambio en auditoría', async () => {
      const p = makeParticipant();
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(p);

      const result = await service.updateParticipant(PARTICIPANT_ID, { firstName: 'NewName' } as any, USER_ID);

      expect(p.update).toHaveBeenCalledWith({ firstName: 'NewName' });
      expect((result as any).firstName).toBe('NewName');
      expect(AuditLogMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entity: 'Participant' })
      );
    });

    it('reemplaza los horarios y limpia GuestSchedule huérfanos preservando acreditados', async () => {
      const p = makeParticipant();
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(p);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([{ id: SCHEDULE_ID_1 }]);
      (GuestMock.findAll as jest.Mock).mockResolvedValue([{ id: 'g1' }]);
      (AccreditationMock.findAll as jest.Mock).mockResolvedValue([{ guestId: 'g1', eventScheduleId: 'sched-acc' }]);
      (GuestScheduleMock.findAll as jest.Mock).mockResolvedValue([
        { id: 'l1', guestId: 'g1', scheduleId: 'sched-stale' }, // se elimina
        { id: 'l2', guestId: 'g1', scheduleId: 'sched-acc' }, // acreditado: se preserva
      ]);

      await service.updateParticipant(PARTICIPANT_ID, { scheduleIds: [SCHEDULE_ID_1] } as any, USER_ID);

      expect(p.setSchedules).toHaveBeenCalled();
      expect(GuestScheduleMock.destroy).toHaveBeenCalledTimes(1);
      const destroyArg = (GuestScheduleMock.destroy as jest.Mock).mock.calls[0][0];
      expect(destroyArg.where.id[Op.in]).toEqual(['l1']);
    });

    it('rechaza datos inválidos (ZodError)', async () => {
      await expect(service.updateParticipant(PARTICIPANT_ID, { firstName: 'x' } as any, USER_ID)).rejects.toThrow();
    });
  });

  // ------------------------------------------------------------------
  // revertToPreloaded
  // ------------------------------------------------------------------
  describe('revertToPreloaded', () => {
    it('lanza error si el participante no existe', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.revertToPreloaded(PARTICIPANT_ID, USER_ID)).rejects.toThrow('Participant not found');
    });

    it('revierte a precargado: borra acreditaciones, invitados públicos y desasocia fechas', async () => {
      const p = { id: PARTICIPANT_ID, firstName: 'A', lastName: 'B', setSchedules: jest.fn().mockResolvedValue(undefined) };
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(p);
      (GuestMock.findAll as jest.Mock).mockResolvedValue([{ id: 'g1' }]);

      const result = await service.revertToPreloaded(PARTICIPANT_ID, USER_ID);

      expect(AccreditationMock.destroy).toHaveBeenCalled();
      expect(GuestMock.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ registrationSource: 'PUBLIC_FORM' }) })
      );
      expect(GuestMock.update).toHaveBeenCalled();
      expect(GuestScheduleMock.destroy).toHaveBeenCalled();
      expect(p.setSchedules).toHaveBeenCalledWith([], expect.any(Object));
      expect(result).toEqual({ message: 'Participant reverted to preloaded' });
    });

    it('hace rollback y propaga el error si algo falla', async () => {
      const tx = makeTx();
      (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
      const p = { id: PARTICIPANT_ID, firstName: 'A', lastName: 'B', setSchedules: jest.fn() };
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(p);
      (GuestMock.findAll as jest.Mock).mockResolvedValue([{ id: 'g1' }]);
      (AccreditationMock.destroy as jest.Mock).mockRejectedValueOnce(new Error('DB down'));

      await expect(service.revertToPreloaded(PARTICIPANT_ID, USER_ID)).rejects.toThrow('DB down');
      expect(tx.rollback).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // deleteParticipant
  // ------------------------------------------------------------------
  describe('deleteParticipant', () => {
    it('lanza error si el participante tiene acreditaciones', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(1);
      await expect(service.deleteParticipant(PARTICIPANT_ID, USER_ID)).rejects.toThrow(
        'Cannot delete participant with existing accreditations.'
      );
    });

    it('lanza error si el participante no existe', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteParticipant(PARTICIPANT_ID, USER_ID)).rejects.toThrow('Participant not found');
    });

    it('elimina participante, invitados e inscripciones en una transacción', async () => {
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID, firstName: 'A', lastName: 'B', email: 'a@b.com' });

      const result = await service.deleteParticipant(PARTICIPANT_ID, USER_ID, 'motivo');

      expect(ParticipantScheduleMock.destroy).toHaveBeenCalled();
      expect(GuestMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { participantId: PARTICIPANT_ID }, force: true }));
      expect(ParticipantMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: PARTICIPANT_ID }, force: true }));
      expect(AuditLogMock.create).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Participante e invitados eliminados correctamente' });
    });

    it('hace rollback y propaga el error si el borrado en cascada falla', async () => {
      const tx = makeTx();
      (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
      (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID, firstName: 'A', lastName: 'B' });
      (ParticipantScheduleMock.destroy as jest.Mock).mockRejectedValueOnce(new Error('cascade fail'));

      await expect(service.deleteParticipant(PARTICIPANT_ID, USER_ID)).rejects.toThrow('cascade fail');
      expect(tx.rollback).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // bulkDeleteParticipants
  // ------------------------------------------------------------------
  describe('bulkDeleteParticipants', () => {
    it('lanza error si no hay ids seleccionados y no es "all"', async () => {
      await expect(service.bulkDeleteParticipants(EVENT_ID, { ids: [] }, USER_ID)).rejects.toThrow(
        'No hay participantes seleccionados.'
      );
    });

    it('elimina los participantes seleccionados y sus invitados', async () => {
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      (GuestMock.findAll as jest.Mock).mockResolvedValue([{ id: 'g1' }]);

      const result = await service.bulkDeleteParticipants(EVENT_ID, { ids: ['p1', 'p2'] }, USER_ID);

      expect(AccreditationMock.destroy).toHaveBeenCalled();
      expect(ParticipantScheduleMock.destroy).toHaveBeenCalled();
      expect(GuestMock.destroy).toHaveBeenCalled();
      expect(ParticipantMock.destroy).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 2, guestsDeleted: 1 });
    });

    it('vacía todos los participantes del evento cuando all=true', async () => {
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([{ id: 'p1' }]);
      (GuestMock.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.bulkDeleteParticipants(EVENT_ID, { all: true }, USER_ID);

      expect(result).toEqual({ deleted: 1, guestsDeleted: 0 });
    });

    it('devuelve cero si no hay participantes que coincidan', async () => {
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([]);
      const result = await service.bulkDeleteParticipants(EVENT_ID, { ids: ['nope'] }, USER_ID);
      expect(result).toEqual({ deleted: 0, guestsDeleted: 0 });
      expect(GuestMock.findAll).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // bulkEnrollParticipants
  // ------------------------------------------------------------------
  describe('bulkEnrollParticipants', () => {
    it('lanza error si no hay participantes', async () => {
      await expect(
        service.bulkEnrollParticipants(EVENT_ID, { participantIds: [], scheduleIds: [SCHEDULE_ID_1] }, USER_ID)
      ).rejects.toThrow('No hay participantes seleccionados.');
    });

    it('lanza error si no hay fechas', async () => {
      await expect(
        service.bulkEnrollParticipants(EVENT_ID, { participantIds: [PARTICIPANT_ID], scheduleIds: [] }, USER_ID)
      ).rejects.toThrow('Debes elegir al menos una fecha.');
    });

    it('lanza error si alguna fecha no pertenece al evento', async () => {
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]); // ninguna encontrada
      await expect(
        service.bulkEnrollParticipants(EVENT_ID, { participantIds: [PARTICIPANT_ID], scheduleIds: [SCHEDULE_ID_1] }, USER_ID)
      ).rejects.toThrow('Una o más fechas no pertenecen a este evento.');
    });

    it('lanza error si no hay participantes válidos para el evento', async () => {
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([{ id: SCHEDULE_ID_1 }]);
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([]);
      await expect(
        service.bulkEnrollParticipants(EVENT_ID, { participantIds: [PARTICIPANT_ID], scheduleIds: [SCHEDULE_ID_1] }, USER_ID)
      ).rejects.toThrow('No hay participantes válidos para este evento.');
    });

    it('inscribe (aditivo) los participantes en las fechas', async () => {
      const schedules = [{ id: SCHEDULE_ID_1 }, { id: SCHEDULE_ID_2 }];
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue(schedules);
      const p1 = { id: PARTICIPANT_ID, addSchedules: jest.fn().mockResolvedValue(undefined) };
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([p1]);

      const result = await service.bulkEnrollParticipants(
        EVENT_ID,
        { participantIds: [PARTICIPANT_ID, PARTICIPANT_ID], scheduleIds: [SCHEDULE_ID_1, SCHEDULE_ID_2] },
        USER_ID
      );

      expect(p1.addSchedules).toHaveBeenCalledWith(schedules, expect.any(Object));
      expect(result).toEqual({ enrolled: 1, schedules: 2 });
    });

    it('hace rollback y propaga el error si addSchedules falla', async () => {
      const tx = makeTx();
      (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([{ id: SCHEDULE_ID_1 }]);
      const p1 = { id: PARTICIPANT_ID, addSchedules: jest.fn().mockRejectedValueOnce(new Error('enroll fail')) };
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([p1]);

      await expect(
        service.bulkEnrollParticipants(EVENT_ID, { participantIds: [PARTICIPANT_ID], scheduleIds: [SCHEDULE_ID_1] }, USER_ID)
      ).rejects.toThrow('enroll fail');
      expect(tx.rollback).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // setGuestDates
  // ------------------------------------------------------------------
  describe('setGuestDates', () => {
    it('lanza error si el participante no existe', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.setGuestDates(PARTICIPANT_ID, [], USER_ID)).rejects.toThrow('Participant not found');
    });

    it('lanza error si el participante no está inscrito en ninguna fecha', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID, schedules: [] });
      await expect(service.setGuestDates(PARTICIPANT_ID, [], USER_ID)).rejects.toThrow(
        'El participante no está inscrito en ninguna fecha.'
      );
    });

    it('asigna fechas a un invitado existente y crea uno nuevo, preservando acreditados', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({
        id: PARTICIPANT_ID,
        firstName: 'A',
        lastName: 'B',
        schedules: [{ id: SCHEDULE_ID_1 }, { id: SCHEDULE_ID_2 }],
      });
      const existingGuest = { id: 'g1', setSchedules: jest.fn().mockResolvedValue(undefined) };
      (GuestMock.findOne as jest.Mock).mockResolvedValue(existingGuest);
      const newGuest = { id: 'g2', setSchedules: jest.fn().mockResolvedValue(undefined) };
      (GuestMock.create as jest.Mock).mockResolvedValue(newGuest);
      // Invitado existente ya acreditado en SCHEDULE_ID_2 -> se preserva aunque no se pida.
      (AccreditationMock.findAll as jest.Mock)
        .mockResolvedValueOnce([{ eventScheduleId: SCHEDULE_ID_2 }])
        .mockResolvedValueOnce([]);

      const result = await service.setGuestDates(
        PARTICIPANT_ID,
        [
          { id: 'g1', scheduleIds: [SCHEDULE_ID_1] },
          { firstName: 'Nuevo', scheduleIds: [SCHEDULE_ID_2] },
        ],
        USER_ID
      );

      expect(result).toEqual({ ok: true, created: 1 });
      // g1: pedido s1 + acreditado s2 = 2 fechas
      expect(existingGuest.setSchedules.mock.calls[0][0]).toHaveLength(2);
      expect(newGuest.setSchedules).toHaveBeenCalled();
      expect(GuestMock.create).toHaveBeenCalledTimes(1);
    });

    it('ignora un invitado ajeno (id que no pertenece al participante)', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({
        id: PARTICIPANT_ID,
        firstName: 'A',
        lastName: 'B',
        schedules: [{ id: SCHEDULE_ID_1 }],
      });
      (GuestMock.findOne as jest.Mock).mockResolvedValue(null); // no encontrado

      const result = await service.setGuestDates(
        PARTICIPANT_ID,
        [
          { id: 'ajeno', scheduleIds: [SCHEDULE_ID_1] },
          { scheduleIds: [SCHEDULE_ID_1] }, // sin id ni nombre: se salta
        ],
        USER_ID
      );

      expect(result).toEqual({ ok: true, created: 0 });
      expect(GuestMock.create).not.toHaveBeenCalled();
    });

    it('hace rollback y propaga el error si falla al procesar un invitado', async () => {
      const tx = makeTx();
      (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({
        id: PARTICIPANT_ID,
        firstName: 'A',
        lastName: 'B',
        schedules: [{ id: SCHEDULE_ID_1 }],
      });
      (GuestMock.findOne as jest.Mock).mockRejectedValueOnce(new Error('guest fail'));

      await expect(
        service.setGuestDates(PARTICIPANT_ID, [{ id: 'g1', scheduleIds: [SCHEDULE_ID_1] }], USER_ID)
      ).rejects.toThrow('guest fail');
      expect(tx.rollback).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // getParticipant
  // ------------------------------------------------------------------
  describe('getParticipant', () => {
    it('lanza error si el participante no existe', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(service.getParticipant(PARTICIPANT_ID)).rejects.toThrow('Participant not found');
    });

    it('devuelve el participante con solo horarios por defecto', async () => {
      const p = { id: PARTICIPANT_ID };
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(p);

      const result = await service.getParticipant(PARTICIPANT_ID);

      const includeArg = (ParticipantMock.findByPk as jest.Mock).mock.calls[0][1].include;
      expect(includeArg).toHaveLength(1); // solo schedules
      expect(result).toBe(p);
    });

    it('incluye los invitados cuando se solicita', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: PARTICIPANT_ID });
      await service.getParticipant(PARTICIPANT_ID, true, true);

      const includeArg = (ParticipantMock.findByPk as jest.Mock).mock.calls[0][1].include;
      expect(includeArg).toHaveLength(2); // guests + schedules
      expect(includeArg.some((i: any) => i.as === 'guests')).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // listParticipants
  // ------------------------------------------------------------------
  describe('listParticipants', () => {
    it('lista con todos los filtros combinados (count numérico)', async () => {
      const rows = [{ id: 'p1' }, { id: 'p2' }];
      (ParticipantMock.findAndCountAll as jest.Mock).mockResolvedValue({ count: 2, rows });

      const result = await service.listParticipants(
        EVENT_ID,
        { name: '11.111.111', email: 'x@y.com', accredited: true, withAward: true, awarded: true, registered: true, mail: 'unsent' },
        { page: 2, limit: 10 }
      );

      expect(ParticipantMock.findAndCountAll).toHaveBeenCalled();
      const opts = (ParticipantMock.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(opts.limit).toBe(10);
      expect(opts.offset).toBe(10);
      expect(result).toEqual({ participants: rows, total: 2, page: 2, limit: 10 });
    });

    it('cuenta agrupado (count como array) y sin paginación cuando limit<=0', async () => {
      (ParticipantMock.findAndCountAll as jest.Mock).mockResolvedValue({ count: [{}, {}, {}], rows: [] });

      const result = await service.listParticipants(EVENT_ID, { mail: 'sent' }, { page: 1, limit: 0 });

      const opts = (ParticipantMock.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(opts.limit).toBeUndefined();
      expect(result.total).toBe(3);
    });

    it('acepta las variantes negativas de los filtros EXISTS y mail=failed', async () => {
      (ParticipantMock.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

      const result = await service.listParticipants(
        EVENT_ID,
        { accredited: false, withAward: false, registered: false, mail: 'failed' },
        { page: 1, limit: 5 }
      );

      expect(result.total).toBe(0);
      expect(ParticipantMock.findAndCountAll).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // searchParticipants
  // ------------------------------------------------------------------
  describe('searchParticipants', () => {
    it('devuelve [] si la consulta tiene menos de 3 caracteres', async () => {
      const result = await service.searchParticipants(EVENT_ID, 'ab');
      expect(result).toEqual([]);
      expect(ParticipantMock.findAll).not.toHaveBeenCalled();
    });

    it('busca participantes y devuelve objetos planos (con término tipo RUT)', async () => {
      const plain = { id: 'p1', guests: [], schedules: [] };
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([{ get: jest.fn().mockReturnValue(plain) }]);

      const result = await service.searchParticipants(EVENT_ID, '11111111');

      expect(ParticipantMock.findAll).toHaveBeenCalled();
      expect(result).toEqual([plain]);
    });

    it('filtra los invitados por la fecha del check-in cuando se pasa scheduleId', async () => {
      const plain = {
        id: 'p1',
        guests: [
          { id: 'g1', schedules: [{ id: SCHEDULE_ID_1 }] }, // coincide
          { id: 'g2', schedules: [] }, // sin fecha: se muestra siempre
          { id: 'g3', schedules: [{ id: SCHEDULE_ID_2 }] }, // otra fecha: se descarta
        ],
      };
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([{ get: jest.fn().mockReturnValue(plain) }]);

      const result = await service.searchParticipants(EVENT_ID, 'Juan', SCHEDULE_ID_1);

      expect(result[0].guests.map((g: any) => g.id)).toEqual(['g1', 'g2']);
    });
  });
});
