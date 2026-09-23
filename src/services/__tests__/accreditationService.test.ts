import { AccreditationService } from '../accreditationService';
import { sequelize } from '@/lib/sequelize';
import Accreditation from '@/models/Accreditation';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import GuestSchedule from '@/models/GuestSchedule';
import EventSchedule from '@/models/EventSchedule';
import Event from '@/models/Event';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const GuestMock = Guest as jest.Mocked<typeof Guest>;
const GuestScheduleMock = GuestSchedule as jest.Mocked<typeof GuestSchedule>;
const EventScheduleMock = EventSchedule as jest.Mocked<typeof EventSchedule>;
const EventMock = Event as jest.Mocked<typeof Event>;

describe('AccreditationService', () => {
  let accreditationService: AccreditationService;

  beforeEach(() => {
    accreditationService = new AccreditationService();
    jest.clearAllMocks();

    // Mock de sequelize.transaction que soporta las 3 firmas que usa el servicio:
    //   transaction()                 -> devuelve la tx (commit/rollback manuales)
    //   transaction(cb)               -> transacción gestionada
    //   transaction(opts, cb)         -> SAVEPOINT anidado (bulkAccredit)
    (sequelize.transaction as jest.Mock).mockImplementation(async (...args: any[]) => {
      const t = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        LOCK: { UPDATE: 'UPDATE' },
      };
      const cb =
        typeof args[0] === 'function' ? args[0] :
        typeof args[1] === 'function' ? args[1] : undefined;
      if (cb) {
        // Para el savepoint anidado se reutiliza la tx padre si viene en las opciones.
        const parent =
          args[0] && typeof args[0] === 'object' && args[0].transaction
            ? args[0].transaction
            : t;
        return cb(parent);
      }
      return t;
    });
  });

  describe('accreditParticipant', () => {
    const participantId = 'participant-1';
    const eventScheduleId = 'schedule-1';
    const accreditedBy = 'user-1';
    const eventId = 'event-1';

    const mockSchedule = { id: eventScheduleId, eventId, isActive: true };
    const mockEvent = { id: eventId, isActive: true };
    const mockParticipant = { id: participantId, eventId };
    const mockAccreditation = { id: 'accred-1', participantId, eventScheduleId };

    it('should accredit a participant successfully', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(mockParticipant);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null); // aún no acreditado
      (AccreditationMock.create as jest.Mock).mockResolvedValue(mockAccreditation);

      // getAccreditationById se ejecuta al final; lo espiamos para no tocar findByPk con include.
      const getByIdSpy = jest
        .spyOn(accreditationService, 'getAccreditationById')
        .mockResolvedValue(mockAccreditation as any);

      const result = await accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy);

      expect(EventScheduleMock.findByPk).toHaveBeenCalledWith(eventScheduleId, expect.any(Object));
      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId, expect.any(Object));
      expect(ParticipantMock.findByPk).toHaveBeenCalledWith(participantId, expect.any(Object));
      expect(AccreditationMock.findOne).toHaveBeenCalled();
      expect(AccreditationMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ participantId, eventScheduleId, accreditedBy }),
        expect.any(Object)
      );
      expect(result).toEqual(mockAccreditation);
      getByIdSpy.mockRestore();
    });

    it('should throw an error if schedule is not found', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy)
      ).rejects.toThrow('Event schedule not found.');
    });

    it('should throw an error if the schedule has no associated event', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy)
      ).rejects.toThrow('Event schedule is not associated with an event.');
    });

    it('should throw an error if the event or schedule is not active', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue({ ...mockSchedule, isActive: false });
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);

      await expect(
        accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy)
      ).rejects.toThrow('The event or schedule is not active.');
    });

    it('should throw an error if participant is already accredited', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(mockParticipant);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(mockAccreditation); // ya acreditado

      await expect(
        accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy)
      ).rejects.toThrow('This person has already been accredited for this schedule.');
    });
  });

  describe('accreditGuest', () => {
    const guestId = 'guest-1';
    const eventScheduleId = 'schedule-1';
    const accreditedBy = 'user-1';
    const eventId = 'event-1';

    const mockSchedule = { id: eventScheduleId, eventId, isActive: true };
    const mockEvent = { id: eventId, isActive: true };
    // El servicio lee el alias en minúscula: person.participant
    const mockGuest = { id: guestId, participant: { eventId } };
    const mockAccreditation = { id: 'accred-2', guestId, eventScheduleId };

    it('should accredit a guest successfully', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest);
      (GuestScheduleMock.count as jest.Mock).mockResolvedValue(0); // sin fechas ligadas -> fallback
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);
      (AccreditationMock.create as jest.Mock).mockResolvedValue(mockAccreditation);

      const getByIdSpy = jest
        .spyOn(accreditationService, 'getAccreditationById')
        .mockResolvedValue(mockAccreditation as any);

      const result = await accreditationService.accreditGuest(guestId, eventScheduleId, accreditedBy);

      expect(GuestMock.findByPk).toHaveBeenCalledWith(guestId, expect.any(Object));
      expect(AccreditationMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ guestId, eventScheduleId, accreditedBy }),
        expect.any(Object)
      );
      expect(result).toEqual(mockAccreditation);
      getByIdSpy.mockRestore();
    });

    it('should throw an error if guest does not belong to the event', async () => {
      const wrongGuest = { id: guestId, participant: { eventId: 'wrong-event' } };
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(wrongGuest);

      await expect(
        accreditationService.accreditGuest(guestId, eventScheduleId, accreditedBy)
      ).rejects.toThrow('Guest not found or does not belong to this event.');
    });

    it('should throw if the guest is registered for other dates but not this one', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest);
      // Ligado a fechas (total > 0) pero ninguna es esta (forThisDate = 0).
      (GuestScheduleMock.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      await expect(
        accreditationService.accreditGuest(guestId, eventScheduleId, accreditedBy)
      ).rejects.toThrow('Este invitado no está registrado para esta fecha.');
    });

    it('should accredit a guest linked specifically to this date', async () => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest);
      // Ligado a fechas y una de ellas es esta.
      (GuestScheduleMock.count as jest.Mock)
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1); // para esta fecha
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);
      (AccreditationMock.create as jest.Mock).mockResolvedValue(mockAccreditation);

      const getByIdSpy = jest
        .spyOn(accreditationService, 'getAccreditationById')
        .mockResolvedValue(mockAccreditation as any);

      const result = await accreditationService.accreditGuest(guestId, eventScheduleId, accreditedBy);

      expect(AccreditationMock.create).toHaveBeenCalled();
      expect(result).toEqual(mockAccreditation);
      getByIdSpy.mockRestore();
    });
  });

  describe('bulkAccredit', () => {
    // UUIDs válidos (el schema de validación los exige).
    const eventScheduleId = '123e4567-e89b-12d3-a456-426614174000';
    const accreditedBy = '123e4567-e89b-12d3-a456-426614174001';
    const eventId = '123e4567-e89b-12d3-a456-426614174002';
    const participantId1 = '123e4567-e89b-12d3-a456-426614174003';
    const guestId1 = '123e4567-e89b-12d3-a456-426614174004';
    const invalidParticipantId = '123e4567-e89b-12d3-a456-426614174005';

    const mockSchedule = { id: eventScheduleId, eventId, isActive: true };
    const mockEvent = { id: eventId, isActive: true };
    const mockParticipant1 = { id: participantId1, eventId };
    const mockGuest1 = { id: guestId1, participant: { eventId } };

    beforeEach(() => {
      (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(mockEvent);
      (GuestScheduleMock.count as jest.Mock).mockResolvedValue(0);
      (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);
      (AccreditationMock.create as jest.Mock).mockResolvedValue({ id: 'new-accred' });
    });

    it('should accredit multiple participants and guests successfully', async () => {
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(mockParticipant1);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest1);

      const accreditations = [
        { type: 'participant', participantId: participantId1, eventScheduleId },
        { type: 'guest', guestId: guestId1, eventScheduleId },
      ];

      const results = await accreditationService.bulkAccredit(accreditations as any, accreditedBy);

      expect(results.created).toBe(2);
      expect(results.errors).toHaveLength(0);
      expect(AccreditationMock.create).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for individual items and continue processing', async () => {
      const accreditations = [
        { type: 'participant', participantId: participantId1, eventScheduleId },
        { type: 'participant', participantId: invalidParticipantId, eventScheduleId }, // este falla
        { type: 'guest', guestId: guestId1, eventScheduleId },
      ];

      // El segundo participante no se encuentra.
      (ParticipantMock.findByPk as jest.Mock)
        .mockResolvedValueOnce(mockParticipant1)
        .mockResolvedValueOnce(null);
      (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest1);

      const results = await accreditationService.bulkAccredit(accreditations as any, accreditedBy);

      expect(results.created).toBe(2);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].error).toContain('Participant not found');
      expect(AccreditationMock.create).toHaveBeenCalledTimes(2);
    });
  });
});
