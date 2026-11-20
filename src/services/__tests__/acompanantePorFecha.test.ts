import {ParticipantService} from '../participantService';
import Participant from '@/models/Participant';
describe('Búsqueda para acreditar acompañante por fecha',()=>{
 const service=new ParticipantService();
 test.each([['a',true,1],['b',false,0]])('fecha %s devuelve solo el adulto declarado para ella',async(id,answer,count)=>{
  const person={id:'p',guestCount:9,guestCompanion:true,guestLoads:8,customData:{_adultCompanionsBySchedule:{a:true,b:false}},schedules:[{id:'a'},{id:'b'}],guests:[]};
  (Participant.findAll as jest.Mock).mockResolvedValue([{get:()=>person}]);
  const result=await service.searchParticipants('e','Persona',id as string);
  expect(result[0]).toMatchObject({guestCount:count,guestCompanion:answer,guestLoads:0});
 });
});
