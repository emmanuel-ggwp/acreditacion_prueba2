import { AccreditationService } from '../accreditationService';
import { sequelize } from '@/lib/sequelize';
import Accreditation from '@/models/Accreditation';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import EventSchedule from '@/models/EventSchedule';
import Event from '@/models/Event';
import User from '@/models/User';

// The models are already mocked by jest.setup.js, so we just need to cast them
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const GuestMock = Guest as jest.Mocked<typeof Guest>;
const EventScheduleMock = EventSchedule as jest.Mocked<typeof EventSchedule>;
const EventMock = Event as jest.Mocked<typeof Event>;

describe('AccreditationService', () => {
  let accreditationService: AccreditationService;

  beforeEach(() => {
    accreditationService = new AccreditationService();
    jest.clearAllMocks();

    // Mock transaction
    (sequelize.transaction as jest.Mock).mockImplementation(async (callback?: (t: any) => Promise<any>) => {
        const t = {
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            LOCK: { UPDATE: 'UPDATE' }
        };
        if (callback) {
            try {
                const result = await callback(t);
                await t.commit();
                return result;
            } catch (error) {
                await t.rollback();
                throw error;
            }
        }
        return t;
    });
  });

  describe('accreditParticipant', () => {
    const participantId = 'participant-1';
    const eventScheduleId = 'schedule-1';
    const accreditedBy = 'user-1';
    const eventId = 'event-1';

    const mockSchedule = {
      id: eventScheduleId,
      eventId,
      isActive: true,
      maxCapacity: 100,
      Event: { id: eventId, isActive: true, maxCapacity: 200 },
    };
    const mockParticipant = { id: participantId, eventId };
    const mockAccreditation = { id: 'accred-1', participantId, eventScheduleId };

    it('should accredit a participant successfully', async () => {
        (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
        (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(mockParticipant);
        (AccreditationMock.count as jest.Mock).mockResolvedValue(50); // Below capacity
        (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null); // Not accredited yet
        (AccreditationMock.create as jest.Mock).mockResolvedValue(mockAccreditation);
        
        // Mock the getAccreditationById call within the service
        const getByIdSpy = jest.spyOn(accreditationService, 'getAccreditationById').mockResolvedValue(mockAccreditation as any);

        const result = await accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy);

        expect(EventScheduleMock.findByPk).toHaveBeenCalledWith(eventScheduleId, expect.any(Object));
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
        ).rejects.toThrow('Event schedule not found or is not associated with an event.');
    });

    it('should throw an error if capacity is reached', async () => {
        (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
        (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(mockParticipant);
        (AccreditationMock.count as jest.Mock).mockResolvedValue(100); // At capacity

        await expect(
            accreditationService.accreditParticipant(participantId, eventScheduleId, accreditedBy)
        ).rejects.toThrow('Event schedule has reached its maximum capacity.');
    });

    it('should throw an error if participant is already accredited', async () => {
        (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
        (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(mockParticipant);
        (AccreditationMock.count as jest.Mock).mockResolvedValue(50);
        (AccreditationMock.findOne as jest.Mock).mockResolvedValue(mockAccreditation); // Already accredited

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
    const participantId = 'participant-1';

    const mockSchedule = {
      id: eventScheduleId,
      eventId,
      isActive: true,
      maxCapacity: 100,
      Event: { id: eventId, isActive: true, maxCapacity: 200 },
    };
    const mockGuest = { id: guestId, Participant: { eventId } };
    const mockAccreditation = { id: 'accred-2', guestId, eventScheduleId };

    it('should accredit a guest successfully', async () => {
        (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
        (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest);
        (AccreditationMock.count as jest.Mock).mockResolvedValue(50);
        (AccreditationMock.findOne as jest.Mock).mockResolvedValue(null);
        (AccreditationMock.create as jest.Mock).mockResolvedValue(mockAccreditation);
        
        const getByIdSpy = jest.spyOn(accreditationService, 'getAccreditationById').mockResolvedValue(mockAccreditation as any);

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
        const wrongGuest = { id: guestId, Participant: { eventId: 'wrong-event' } };
        (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
        (GuestMock.findByPk as jest.Mock).mockResolvedValue(wrongGuest);

        await expect(
            accreditationService.accreditGuest(guestId, eventScheduleId, accreditedBy)
        ).rejects.toThrow('Guest not found or does not belong to this event.');
    });
  });

  describe('checkOut', () => {
    const accreditationId = 'accred-1';
    const checkedOutBy = 'user-2';

    it('should check out an accreditation successfully', async () => {
      const mockAccreditation = {
        id: accreditationId,
        checkInTime: new Date(),
        checkOutTime: null,
        save: jest.fn(function(this: any) {
            this.checkOutTime = new Date();
            (this as any).checkedOutBy = checkedOutBy;
            return Promise.resolve(this);
        }),
      };
      (AccreditationMock.findByPk as jest.Mock).mockResolvedValue(mockAccreditation);

      const result = await accreditationService.checkOut(accreditationId, checkedOutBy);

      expect(AccreditationMock.findByPk).toHaveBeenCalledWith(accreditationId);
      expect(mockAccreditation.save).toHaveBeenCalled();
      expect(result.checkOutTime).not.toBeNull();
      expect((result as any).checkedOutBy).toEqual(checkedOutBy);
    });

    it('should throw an error if accreditation not found', async () => {
      (AccreditationMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        accreditationService.checkOut(accreditationId, checkedOutBy)
      ).rejects.toThrow('Accreditation not found');
    });

    it('should throw an error if already checked out', async () => {
      const mockAccreditation = {
        id: accreditationId,
        checkInTime: new Date(),
        checkOutTime: new Date(), // Already has a checkout time
      };
      (AccreditationMock.findByPk as jest.Mock).mockResolvedValue(mockAccreditation);

      await expect(
        accreditationService.checkOut(accreditationId, checkedOutBy)
      ).rejects.toThrow('Already checked out.');
    });

    it('should throw an error if not checked in', async () => {
        const mockAccreditation = {
          id: accreditationId,
          checkInTime: null, // No check-in time
          checkOutTime: null,
        };
        (AccreditationMock.findByPk as jest.Mock).mockResolvedValue(mockAccreditation);
  
        await expect(
          accreditationService.checkOut(accreditationId, checkedOutBy)
        ).rejects.toThrow('Cannot check out without a check-in time.');
      });
  });

  describe('bulkAccredit', () => {
    // Use valid UUIDs for testing
    const eventScheduleId = '123e4567-e89b-12d3-a456-426614174000';
    const accreditedBy = '123e4567-e89b-12d3-a456-426614174001';
    const eventId = '123e4567-e89b-12d3-a456-426614174002';
    const participantId1 = '123e4567-e89b-12d3-a456-426614174003';
    const guestId1 = '123e4567-e89b-12d3-a456-426614174004';
    const invalidParticipantId = '123e4567-e89b-12d3-a456-426614174005';

    const mockSchedule = {
      id: eventScheduleId,
      eventId,
      isActive: true,
      maxCapacity: 100,
      Event: { id: eventId, isActive: true, maxCapacity: 200 },
    };
    const mockParticipant1 = { id: participantId1, eventId };
    const mockGuest1 = { id: guestId1, Participant: { eventId } };


    beforeEach(() => {
        // Reset mocks before each test in this block
        (EventScheduleMock.findByPk as jest.Mock).mockResolvedValue(mockSchedule);
        (AccreditationMock.count as jest.Mock).mockResolvedValue(0);
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
            { type: 'participant', participantId: invalidParticipantId, eventScheduleId }, // This one will fail
            { type: 'guest', guestId: guestId1, eventScheduleId },
        ];

        // Mock successful lookups for valid items
        (ParticipantMock.findByPk as jest.Mock)
            .mockResolvedValueOnce(mockParticipant1)
            .mockResolvedValueOnce(null); // Simulate participant not found for the invalid one
        (GuestMock.findByPk as jest.Mock).mockResolvedValue(mockGuest1);


        const results = await accreditationService.bulkAccredit(accreditations as any, accreditedBy);

        expect(results.created).toBe(2);
        expect(results.errors).toHaveLength(1);
        expect(results.errors[0].error).toContain('Participant not found');
        expect(AccreditationMock.create).toHaveBeenCalledTimes(2);
    });
  });
});
