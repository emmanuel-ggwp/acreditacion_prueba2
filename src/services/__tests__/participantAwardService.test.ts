import { Op } from 'sequelize';
import { ParticipantAwardService } from '../participantAwardService';
import { sequelize } from '@/lib/sequelize';
import ParticipantAward from '@/models/ParticipantAward';
import Participant from '@/models/Participant';
import Award from '@/models/Award';

// Los modelos ya están mockeados por jest.setup.js; aquí solo los tipamos como mocks.
const ParticipantAwardMock = ParticipantAward as jest.Mocked<typeof ParticipantAward>;
const ParticipantMock = Participant as jest.Mocked<typeof Participant>;
const AwardMock = Award as jest.Mocked<typeof Award>;

describe('ParticipantAwardService', () => {
  let service: ParticipantAwardService;

  const awardId = '123e4567-e89b-12d3-a456-426614174000';
  const participantId = '123e4567-e89b-12d3-a456-426614174001';
  const assignedBy = '123e4567-e89b-12d3-a456-426614174002';
  const eventId = '123e4567-e89b-12d3-a456-426614174003';
  const participantAwardId = '123e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    service = new ParticipantAwardService();
    jest.clearAllMocks();

    // Transacción gestionada con LOCK, tal y como la usa el servicio:
    //   transaction(cb) -> cb recibe la tx (con LOCK.UPDATE) y su valor se devuelve.
    (sequelize.transaction as jest.Mock).mockImplementation(async (a: any, b?: any) => {
      const t = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        LOCK: { UPDATE: 'UPDATE' },
      };
      const cb = typeof a === 'function' ? a : typeof b === 'function' ? b : undefined;
      if (cb) {
        const parent = a && typeof a === 'object' && a.transaction ? a.transaction : t;
        return cb(parent);
      }
      return t;
    });
  });

  describe('assignAward', () => {
    it('asigna un premio correctamente', async () => {
      const created = { id: participantAwardId, participantId, awardId, assignedBy };
      (AwardMock.findByPk as jest.Mock).mockResolvedValue({ id: awardId, eventId, quantity: 10 });
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: participantId, eventId });
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(5);
      (ParticipantAwardMock.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantAwardMock.create as jest.Mock).mockResolvedValue(created);

      const result = await service.assignAward(participantId, awardId, assignedBy, 'una nota');

      expect(AwardMock.findByPk).toHaveBeenCalledWith(
        awardId,
        expect.objectContaining({ lock: 'UPDATE' }),
      );
      expect(ParticipantMock.findByPk).toHaveBeenCalledWith(participantId, expect.any(Object));
      expect(ParticipantAwardMock.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { awardId } }),
      );
      expect(ParticipantAwardMock.create).toHaveBeenCalledWith(
        { participantId, awardId, assignedBy, notes: 'una nota' },
        expect.any(Object),
      );
      expect(result).toEqual(created);
    });

    it('lanza error si el premio no existe', async () => {
      (AwardMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.assignAward(participantId, awardId, assignedBy)).rejects.toThrow(
        'Award not found.',
      );
      expect(ParticipantAwardMock.create).not.toHaveBeenCalled();
    });

    it('lanza error si el participante no existe', async () => {
      (AwardMock.findByPk as jest.Mock).mockResolvedValue({ id: awardId, eventId, quantity: 10 });
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.assignAward(participantId, awardId, assignedBy)).rejects.toThrow(
        'Participant not found.',
      );
    });

    it('lanza error si participante y premio son de eventos distintos', async () => {
      (AwardMock.findByPk as jest.Mock).mockResolvedValue({ id: awardId, eventId, quantity: 10 });
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: participantId, eventId: 'otro-evento' });

      await expect(service.assignAward(participantId, awardId, assignedBy)).rejects.toThrow(
        'Participant and Award do not belong to the same event.',
      );
    });

    it('lanza error si el premio está agotado', async () => {
      (AwardMock.findByPk as jest.Mock).mockResolvedValue({ id: awardId, eventId, quantity: 5 });
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: participantId, eventId });
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(5); // >= quantity

      await expect(service.assignAward(participantId, awardId, assignedBy)).rejects.toThrow(
        'Award is out of stock.',
      );
    });

    it('lanza error si el participante ya tenía asignado ese premio', async () => {
      (AwardMock.findByPk as jest.Mock).mockResolvedValue({ id: awardId, eventId, quantity: 10 });
      (ParticipantMock.findByPk as jest.Mock).mockResolvedValue({ id: participantId, eventId });
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(1);
      (ParticipantAwardMock.findOne as jest.Mock).mockResolvedValue({ id: participantAwardId });

      await expect(service.assignAward(participantId, awardId, assignedBy)).rejects.toThrow(
        'This participant has already been assigned this award.',
      );
      expect(ParticipantAwardMock.create).not.toHaveBeenCalled();
    });
  });

  describe('deliverAward', () => {
    it('entrega un premio correctamente', async () => {
      const pa: any = { id: participantAwardId, deliveredAt: null, save: jest.fn().mockResolvedValue(undefined) };
      (ParticipantAwardMock.findByPk as jest.Mock).mockResolvedValue(pa);

      const result = await service.deliverAward(participantAwardId, assignedBy);

      expect(ParticipantAwardMock.findByPk).toHaveBeenCalledWith(
        participantAwardId,
        expect.objectContaining({ lock: 'UPDATE' }),
      );
      expect(pa.deliveredBy).toBe(assignedBy);
      expect(pa.deliveredAt).toBeInstanceOf(Date);
      expect(pa.save).toHaveBeenCalledWith(expect.objectContaining({ transaction: expect.anything() }));
      expect(result).toBe(pa);
    });

    it('lanza error si la asignación no existe', async () => {
      (ParticipantAwardMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.deliverAward(participantAwardId, assignedBy)).rejects.toThrow(
        'Award assignment not found.',
      );
    });

    it('lanza error si el premio ya fue entregado', async () => {
      const pa: any = { id: participantAwardId, deliveredAt: new Date(), save: jest.fn() };
      (ParticipantAwardMock.findByPk as jest.Mock).mockResolvedValue(pa);

      await expect(service.deliverAward(participantAwardId, assignedBy)).rejects.toThrow(
        'Award has already been delivered.',
      );
      expect(pa.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelAwardAssignment', () => {
    it('cancela una asignación no entregada', async () => {
      const pa: any = { id: participantAwardId, deliveredAt: null, destroy: jest.fn().mockResolvedValue(undefined) };
      (ParticipantAwardMock.findByPk as jest.Mock).mockResolvedValue(pa);

      const result = await service.cancelAwardAssignment(participantAwardId, assignedBy);

      expect(pa.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Award assignment cancelled successfully.' });
    });

    it('lanza error si la asignación no existe', async () => {
      (ParticipantAwardMock.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.cancelAwardAssignment(participantAwardId, assignedBy)).rejects.toThrow(
        'Award assignment not found.',
      );
    });

    it('lanza error si el premio ya fue entregado', async () => {
      const pa: any = { id: participantAwardId, deliveredAt: new Date(), destroy: jest.fn() };
      (ParticipantAwardMock.findByPk as jest.Mock).mockResolvedValue(pa);

      await expect(service.cancelAwardAssignment(participantAwardId, assignedBy)).rejects.toThrow(
        'Cannot cancel an award assignment that has already been delivered.',
      );
      expect(pa.destroy).not.toHaveBeenCalled();
    });
  });

  describe('listParticipantAwards', () => {
    it('devuelve las asignaciones del participante', async () => {
      const rows = [{ id: 'pa-1' }, { id: 'pa-2' }];
      (ParticipantAwardMock.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await service.listParticipantAwards(participantId);

      expect(ParticipantAwardMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { participantId } }),
      );
      expect(result).toBe(rows);
    });
  });

  describe('listAwardAssignments', () => {
    it('sin filtro de entrega solo filtra por awardId', async () => {
      (ParticipantAwardMock.findAll as jest.Mock).mockResolvedValue([]);

      await service.listAwardAssignments(awardId);

      const arg = (ParticipantAwardMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where).toEqual({ awardId });
    });

    it('delivered=true filtra por deliveredAt no nulo', async () => {
      (ParticipantAwardMock.findAll as jest.Mock).mockResolvedValue([]);

      await service.listAwardAssignments(awardId, true);

      const arg = (ParticipantAwardMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where.awardId).toBe(awardId);
      expect(arg.where.deliveredAt).toEqual({ [Op.ne]: null });
    });

    it('delivered=false filtra por deliveredAt nulo', async () => {
      (ParticipantAwardMock.findAll as jest.Mock).mockResolvedValue([]);

      await service.listAwardAssignments(awardId, false);

      const arg = (ParticipantAwardMock.findAll as jest.Mock).mock.calls[0][0];
      expect(arg.where.deliveredAt).toEqual({ [Op.is]: null });
    });
  });

  describe('getAwardStatistics', () => {
    it('calcula estadísticas con participantes en el evento', async () => {
      const awards = [
        { id: 'award-a', name: 'Premio A', quantity: 10 },
        { id: 'award-b', name: 'Premio B', quantity: 4 },
      ];
      (AwardMock.findAll as jest.Mock).mockResolvedValue(awards);
      (ParticipantMock.count as jest.Mock).mockResolvedValue(20);
      // assigned vs delivered según haya o no filtro deliveredAt.
      (ParticipantAwardMock.count as jest.Mock).mockImplementation(async (opts: any) =>
        opts?.where?.deliveredAt ? 3 : 6,
      );
      // Distinct de participantes premiados: findAll cuya .length se usa.
      (ParticipantAwardMock.findAll as jest.Mock).mockResolvedValue([{}, {}, {}, {}, {}]);

      const result = await service.getAwardStatistics(eventId);

      expect(AwardMock.findAll).toHaveBeenCalledWith({ where: { eventId } });
      expect(ParticipantMock.count).toHaveBeenCalledWith({ where: { eventId } });
      expect(result.awardDetails).toHaveLength(2);
      expect(result.awardDetails[0]).toEqual({
        awardId: 'award-a',
        name: 'Premio A',
        totalStock: 10,
        assigned: 6,
        delivered: 3,
        available: 4, // 10 - 6
      });
      expect(result.participantSummary).toEqual({
        totalParticipants: 20,
        awardedParticipants: 5,
        percentageAwarded: 25, // 5 / 20 * 100
      });
    });

    it('devuelve 0% cuando el evento no tiene participantes', async () => {
      (AwardMock.findAll as jest.Mock).mockResolvedValue([]);
      (ParticipantMock.count as jest.Mock).mockResolvedValue(0);
      (ParticipantAwardMock.findAll as jest.Mock).mockResolvedValue([]);

      const result = await service.getAwardStatistics(eventId);

      expect(result.awardDetails).toEqual([]);
      expect(result.participantSummary).toEqual({
        totalParticipants: 0,
        awardedParticipants: 0,
        percentageAwarded: 0,
      });
    });
  });
});
