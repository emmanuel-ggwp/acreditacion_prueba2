import { EventService } from '../eventService';
import { sequelize } from '@/lib/sequelize';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
describe('Tarjetas de eventos: titulares y cantidades de invitados separados',()=>{
 test('conserva titulares para el cupo y agrega invitados sin perder las cantidades',async()=>{
  jest.clearAllMocks();
  const event={id:'e',setDataValue:jest.fn()};
  (Event.findAndCountAll as jest.Mock).mockResolvedValue({rows:[event],count:1});
  (EventSchedule.findAll as jest.Mock).mockResolvedValueOnce([{eventId:'e',count:10}]).mockResolvedValueOnce([{eventId:'e',count:3}]);
  (sequelize.query as jest.Mock).mockResolvedValue([{eventId:'e',registeredGuests:24,accreditedGuests:8}]);
  await new EventService().getAllEvents({});
  expect(event.setDataValue).toHaveBeenCalledWith('participantCount',10);
  expect(event.setDataValue).toHaveBeenCalledWith('accreditedCount',3);
  expect(event.setDataValue).toHaveBeenCalledWith('registeredGuestCount',24);
  expect(event.setDataValue).toHaveBeenCalledWith('accreditedGuestCount',8);
 });
});
