import {
  getScheduleParticipantCount,
  getEventParticipantCount,
  annotateEventCapacity,
} from '../capacityService';
import { sequelize } from '@/lib/sequelize';
import { QueryTypes } from 'sequelize';

// @/lib/sequelize está mockeado por jest.setup.js; sequelize.query es un jest.fn().
const queryMock = sequelize.query as jest.Mock;

describe('capacityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getScheduleParticipantCount', () => {
    it('returns the count from the first row', async () => {
      queryMock.mockResolvedValue([{ c: 7 }]);

      const result = await getScheduleParticipantCount('sched-1');

      expect(result).toBe(7);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('participant_schedules'),
        expect.objectContaining({
          replacements: { sid: 'sched-1' },
          type: QueryTypes.SELECT,
          transaction: undefined,
        })
      );
    });

    it('forwards a transaction when provided', async () => {
      queryMock.mockResolvedValue([{ c: 1 }]);
      const tx = { id: 'tx-1' };

      await getScheduleParticipantCount('sched-1', tx);

      expect(queryMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ transaction: tx })
      );
    });

    it('returns 0 when the count is falsy', async () => {
      queryMock.mockResolvedValue([{ c: 0 }]);
      expect(await getScheduleParticipantCount('sched-1')).toBe(0);
    });

    it('returns 0 when no rows are returned', async () => {
      queryMock.mockResolvedValue([]);
      expect(await getScheduleParticipantCount('sched-1')).toBe(0);
    });
  });

  describe('getEventParticipantCount', () => {
    it('returns the distinct participant count from the first row', async () => {
      queryMock.mockResolvedValue([{ c: 12 }]);

      const result = await getEventParticipantCount('event-1');

      expect(result).toBe(12);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT ps.participant_id)'),
        expect.objectContaining({
          replacements: { eid: 'event-1' },
          type: QueryTypes.SELECT,
          transaction: undefined,
        })
      );
    });

    it('forwards a transaction when provided', async () => {
      queryMock.mockResolvedValue([{ c: 3 }]);
      const tx = { id: 'tx-2' };

      await getEventParticipantCount('event-1', tx);

      expect(queryMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ transaction: tx })
      );
    });

    it('returns 0 when no rows are returned', async () => {
      queryMock.mockResolvedValue([]);
      expect(await getEventParticipantCount('event-1')).toBe(0);
    });
  });

  describe('annotateEventCapacity', () => {
    it('annotates the event and each schedule with capacity info', async () => {
      const event = {
        id: 'event-1',
        maxCapacity: 100,
        schedules: [
          { id: 's1', maxCapacity: 10 }, // 8 inscritos -> 2 libres, no lleno
          { id: 's2', maxCapacity: 5 },  // 5 inscritos -> 0 libres, lleno
          { id: 's3', maxCapacity: 0 },  // sin tope -> spotsLeft null
        ],
      };

      // 1ª query: conteo por horario (schedMap). 2ª query: conteo del evento.
      queryMock
        .mockResolvedValueOnce([
          { scheduleId: 's1', c: 8 },
          { scheduleId: 's2', c: 5 },
        ])
        .mockResolvedValueOnce([{ c: 40 }]);

      const result = await annotateEventCapacity(event);

      // Muta y devuelve el mismo objeto.
      expect(result).toBe(event);

      expect(event.eventFull).toBe(false);
      expect(event.capacityInfo).toEqual({ eventCount: 40, eventMax: 100 });

      const [s1, s2, s3] = event.schedules as any[];
      expect(s1).toMatchObject({ registeredCount: 8, full: false, spotsLeft: 2 });
      expect(s2).toMatchObject({ registeredCount: 5, full: true, spotsLeft: 0 });
      // Horario sin id en schedMap y sin tope: 0 inscritos, no lleno, spotsLeft null.
      expect(s3).toMatchObject({ registeredCount: 0, full: false, spotsLeft: null });

      // Primera query incluye los ids de los horarios.
      expect(queryMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('GROUP BY ps.schedule_id'),
        expect.objectContaining({
          replacements: { ids: ['s1', 's2', 's3'] },
          type: QueryTypes.SELECT,
        })
      );
      expect(queryMock).toHaveBeenCalledTimes(2);
    });

    it('flags the event as full when the count reaches maxCapacity', async () => {
      const event = {
        id: 'event-1',
        maxCapacity: 30,
        schedules: [{ id: 's1', maxCapacity: 10 }],
      };
      queryMock
        .mockResolvedValueOnce([{ scheduleId: 's1', c: 4 }])
        .mockResolvedValueOnce([{ c: 30 }]);

      await annotateEventCapacity(event);

      expect(event.eventFull).toBe(true);
      expect(event.capacityInfo).toEqual({ eventCount: 30, eventMax: 30 });
    });

    it('never marks the event full when maxCapacity is 0/unset', async () => {
      const event = {
        id: 'event-1',
        maxCapacity: 0,
        schedules: [{ id: 's1', maxCapacity: 10 }],
      };
      queryMock
        .mockResolvedValueOnce([{ scheduleId: 's1', c: 4 }])
        .mockResolvedValueOnce([{ c: 999 }]);

      await annotateEventCapacity(event);

      expect(event.eventFull).toBe(false);
      expect(event.capacityInfo).toEqual({ eventCount: 999, eventMax: 0 });
    });

    it('skips the per-schedule query when there are no schedules', async () => {
      const event = { id: 'event-1', maxCapacity: 50, schedules: [] };
      // Solo se ejecuta la query del conteo de evento.
      queryMock.mockResolvedValueOnce([{ c: 0 }]);

      const result = await annotateEventCapacity(event);

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(result.eventFull).toBe(false);
      expect(result.capacityInfo).toEqual({ eventCount: 0, eventMax: 50 });
      expect(result.schedules).toEqual([]);
    });

    it('treats a non-array schedules field as empty', async () => {
      const event: any = { id: 'event-1', maxCapacity: 10, schedules: undefined };
      queryMock.mockResolvedValueOnce([{ c: 2 }]);

      const result = await annotateEventCapacity(event);

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(result.capacityInfo).toEqual({ eventCount: 2, eventMax: 10 });
    });
  });
});
