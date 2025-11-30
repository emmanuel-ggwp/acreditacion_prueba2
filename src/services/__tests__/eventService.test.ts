// src/services/__tests__/eventService.test.ts
import { EventService } from '../eventService';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import Participant from '@/models/Participant';
import Accreditation from '@/models/Accreditation';
import Award from '@/models/Award';
import ParticipantAward from '@/models/ParticipantAward';
import { z } from 'zod';

jest.mock('@/models/Event');
jest.mock('@/models/EventSchedule');
jest.mock('@/models/Participant');
jest.mock('@/models/Accreditation');
jest.mock('@/models/Award');
jest.mock('@/models/ParticipantAward');

const EventMock = Event as jest.Mocked<typeof Event>;
const EventScheduleMock = EventSchedule as jest.Mocked<typeof EventSchedule>;
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const AccreditationMock = Accreditation as jest.Mocked<typeof Accreditation>;
const AwardMock = Award as jest.Mocked<typeof Award>;
const ParticipantAwardMock = ParticipantAward as jest.Mocked<typeof ParticipantAward>;

describe('EventService', () => {
  let eventService: EventService;
  const eventData = {
    name: 'Test Event',
    description: 'A test event',
    location: 'Online',
    maxCapacity: 100,
    allowGuests: true,
    maxGuestsPerParticipant: 0,
  };

  beforeEach(() => {
    eventService = new EventService();
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event with valid data', async () => {
      const createdEvent = { id: '1', ...eventData, deleted: false };
      (EventMock.create as jest.Mock).mockResolvedValue(createdEvent);

      const result = await eventService.createEvent(eventData);

      expect(EventMock.create).toHaveBeenCalledWith(eventData);
      expect(result).toEqual(createdEvent);
    });

    it('should throw a validation error for invalid data', async () => {
      const invalidData = { name: '' }; // name is required
      await expect(eventService.createEvent(invalidData as any)).rejects.toThrow(z.ZodError);
    });
  });

  describe('updateEvent', () => {
    it('should update an event that exists', async () => {
      const eventId = 1;
      const updateData = { name: 'Updated Test Event' };
      const initialEventData = {
        name: 'Test Event',
        description: 'A test event',
        location: 'Online',
        maxCapacity: 100,
        allowGuests: true,
        maxGuestsPerParticipant: 0,
      };
      const initialEvent = {
        id: eventId,
        ...initialEventData,
        update: jest.fn(function(this: any, data: any) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
      };

      (EventMock.findByPk as jest.Mock).mockResolvedValue(initialEvent);

      const result = await eventService.updateEvent(eventId, updateData);

      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId);
      expect(initialEvent.update).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(result.name).toEqual(updateData.name);
    });

    it('should throw an error if event not found', async () => {
      (EventMock.findByPk as jest.Mock).mockResolvedValue(null);
      await expect(eventService.updateEvent(999, { name: 'test' })).rejects.toThrow('Event not found');
    });
  });

  describe('deleteEvent', () => {
    it('should soft delete an event', async () => {
      const eventId = 1;
      const eventInstance = { id: eventId, destroy: jest.fn() };
      (EventMock.findByPk as jest.Mock).mockResolvedValue(eventInstance);

      const result = await eventService.deleteEvent(eventId);

      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId);
      expect(eventInstance.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Event deleted successfully' });
    });
  });

  describe('getEventById', () => {
    it('should return an event by its ID', async () => {
      const eventId = 1;
      const event = { id: eventId, name: 'Test Event' };
      (EventMock.findByPk as jest.Mock).mockResolvedValue(event);

      const result = await eventService.getEventById(eventId);

      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId, expect.any(Object));
      expect(result).toEqual(event);
    });
  });

  describe('getAllEvents', () => {
    it('should return a paginated list of events', async () => {
        const events = [{ id: 1, name: 'Event 1' }, { id: 2, name: 'Event 2' }];
        const count = [{ count: 1 }, { count: 1 }]; // Simulate count for two groups
        (EventMock.findAndCountAll as jest.Mock).mockResolvedValue({ rows: events, count: count });

        const result = await eventService.getAllEvents({});
        
        expect(EventMock.findAndCountAll).toHaveBeenCalled();
        expect(result.events).toEqual(events);
        expect(result.total).toBe(2);
    });
  });

  describe('getEventStatistics', () => {
    it('should return detailed statistics for an event', async () => {
        const eventId = 1;
        const event = { id: eventId, name: 'Stats Event', maxCapacity: 100 };
        (EventMock.findByPk as jest.Mock).mockResolvedValue(event);
        (ParticipantMock.count as jest.Mock).mockResolvedValue(50);
        (AccreditationMock.findAll as jest.Mock).mockResolvedValue([
            { eventScheduleId: 1, EventSchedule: { scheduleName: 'Morning' }, get: () => 20 }
        ]);
        (AwardMock.findAll as jest.Mock).mockResolvedValue([
            { id: 1, name: 'T-Shirt', quantity: 100 }
        ]);
        (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(15);
        (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([
            { id: 1, scheduleName: 'Morning', maxCapacity: 50, Accreditations: { length: 20 } }
        ]);

        const stats = await eventService.getEventStatistics(eventId);

        expect(stats.totalParticipants).toBe(50);
        expect(stats.accreditedBySchedule[0].accreditedCount).toBe(20);
        expect(stats.awards.total).toBe(100);
        expect(stats.awards.delivered).toBe(15);
        expect(stats.capacityUsage[0].available).toBe(30);
    });
  });
});
