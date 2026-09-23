// src/services/__tests__/eventService.test.ts
import { EventService } from '../eventService';
import { sequelize } from '@/lib/sequelize';
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

      const result = await eventService.createEvent(eventData as any, 'test-user');

      // El servicio valida (añade defaults del schema) y agrega createdBy.
      expect(EventMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...eventData, createdBy: 'test-user' })
      );
      expect(result).toEqual(createdEvent);
    });

    it('should throw a validation error for invalid data', async () => {
      const invalidData = { name: '' }; // name is required
      await expect(eventService.createEvent(invalidData as any, 'test-user')).rejects.toThrow(z.ZodError);
    });
  });

  describe('updateEvent', () => {
    it('should update an event that exists', async () => {
      const eventId = '1';
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
        // El servicio usa get({ plain: true }) para el diff de auditoría.
        get: jest.fn(function (this: any) {
          const { get: _g, update: _u, ...plain } = this;
          return plain;
        }),
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
      await expect(eventService.updateEvent('999', { name: 'test' })).rejects.toThrow('Event not found');
    });
  });

  describe('deleteEvent', () => {
    it('should soft delete an event', async () => {
      const eventId = '1';
      const eventInstance = { id: eventId, name: 'Test Event', destroy: jest.fn() };

      // El borrado corre en una transacción con cascada; sin hijos que limpiar.
      const tx = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };
      (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
      (EventMock.findByPk as jest.Mock).mockResolvedValue(eventInstance);
      (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]);
      (ParticipantMock.findAll as jest.Mock).mockResolvedValue([]);
      (AwardMock.findAll as jest.Mock).mockResolvedValue([]);

      const result = await eventService.deleteEvent(eventId);

      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId);
      expect(eventInstance.destroy).toHaveBeenCalledWith(expect.objectContaining({ transaction: tx }));
      expect(tx.commit).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Event deleted successfully' });
    });
  });

  describe('getEventById', () => {
    it('should return an event by its ID', async () => {
      const eventId = '1';
      const event = { id: eventId, name: 'Test Event' };
      (EventMock.findByPk as jest.Mock).mockResolvedValue(event);

      const result = await eventService.getEventById(eventId);

      expect(EventMock.findByPk).toHaveBeenCalledWith(eventId, expect.any(Object));
      expect(result).toEqual(event);
    });
  });

  describe('getAllEvents', () => {
    it('should return a paginated list of events', async () => {
        // Cada fila es una instancia: el servicio le fija participantCount con setDataValue.
        const events = [
          { id: '1', name: 'Event 1', setDataValue: jest.fn() },
          { id: '2', name: 'Event 2', setDataValue: jest.fn() },
        ];
        // Con distinct:true y sin include agrupado, count es un número.
        (EventMock.findAndCountAll as jest.Mock).mockResolvedValue({ rows: events, count: 2 });
        // _updateScheduleStatuses() y el conteo de participantes usan EventSchedule.findAll.
        (EventScheduleMock.findAll as jest.Mock).mockResolvedValue([]);

        const result = await eventService.getAllEvents({});

        expect(EventMock.findAndCountAll).toHaveBeenCalled();
        expect(result.events).toEqual(events);
        expect(result.total).toBe(2);
    });
  });

});
