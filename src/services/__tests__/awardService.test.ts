import { AwardService } from '../awardService';
import Award from '@/models/Award';
import ParticipantAward from '@/models/ParticipantAward';

// Mocks are handled by jest.setup.js
const AwardMock = Award as jest.Mocked<typeof Award>;
const ParticipantAwardMock = ParticipantAward as jest.Mocked<typeof ParticipantAward>;

describe('AwardService', () => {
  let awardService: AwardService;

  beforeEach(() => {
    awardService = new AwardService();
    jest.clearAllMocks();
  });

  describe('createAward', () => {
    it('should create an award successfully', async () => {
      const eventId = '123e4567-e89b-12d3-a456-426614174000';
      const createdBy = '123e4567-e89b-12d3-a456-426614174001';
      const awardData = { name: 'Best Participant', quantity: 10, eventId };
      const createdAward = { id: 'award-1', ...awardData, createdBy };

      (AwardMock.create as jest.Mock).mockResolvedValue(createdAward);

      const result = await awardService.createAward(eventId, awardData, createdBy);

      expect(AwardMock.create).toHaveBeenCalledWith({ ...awardData, createdBy });
      expect(result).toEqual(createdAward);
    });
  });

  describe('updateAward', () => {
    const awardId = 'award-1';
    const userId = 'user-1';
    const initialAward = { 
        id: awardId, 
        name: 'Old Name', 
        quantity: 10, 
        update: jest.fn(function(this: any, data: any) {
            Object.assign(this, data);
            return Promise.resolve(this);
        })
    };

    it('should update an award successfully', async () => {
      const updateData = { name: 'New Name', quantity: 15 };
      (AwardMock.findByPk as jest.Mock).mockResolvedValue(initialAward);
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(5); // 5 assigned
      
      const result = await awardService.updateAward(awardId, updateData, userId);

      expect(AwardMock.findByPk).toHaveBeenCalledWith(awardId);
      expect(initialAward.update).toHaveBeenCalledWith(updateData);
      expect(result.name).toBe('New Name');
    });

    it('should throw an error if quantity is less than assigned count', async () => {
      const updateData = { quantity: 4 }; // Less than 5 assigned
      (AwardMock.findByPk as jest.Mock).mockResolvedValue(initialAward);
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(5);

      await expect(awardService.updateAward(awardId, updateData, userId)).rejects.toThrow(
        'Cannot set quantity below the number of already assigned awards (5).'
      );
    });
  });

  describe('deleteAward', () => {
    const awardId = 'award-1';
    const userId = 'user-1';
    const mockAward = { id: awardId, destroy: jest.fn() };

    it('should delete an award if it has no assignments', async () => {
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(0);
      (AwardMock.findByPk as jest.Mock).mockResolvedValue(mockAward);

      const result = await awardService.deleteAward(awardId, userId);

      expect(mockAward.destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Award deleted successfully' });
    });

    it('should throw an error if the award has assignments', async () => {
      (ParticipantAwardMock.count as jest.Mock).mockResolvedValue(1);

      await expect(awardService.deleteAward(awardId, userId)).rejects.toThrow(
        'Cannot delete award with existing assignments.'
      );
    });
  });
});
