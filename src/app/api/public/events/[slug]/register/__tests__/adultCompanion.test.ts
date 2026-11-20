jest.mock('@/lib/rate-limit',()=>({limitPublicRegister:jest.fn().mockResolvedValue(null)}));
jest.mock('@/services/capacityService',()=>({getScheduleParticipantCount:jest.fn().mockResolvedValue(0),getEventParticipantCount:jest.fn().mockResolvedValue(0)}));
import {POST} from '../route';
import {Event,Participant,EventSchedule,Guest,GuestSchedule} from '@/models/index';
import {sequelize} from '@/lib/sequelize';
import {ADULT_COMPANIONS_KEY as KEY} from '@/utils/adultCompanion';
const A='11111111-1111-4111-a111-111111111111',B='22222222-2222-4222-a222-222222222222',PID='55555555-5555-4555-a555-555555555555';
const call=(extra:any={})=>POST(new Request('http://localhost/register',{method:'POST',body:JSON.stringify({firstName:'Ana',lastName:'Prueba',documentNumber:'12345678-9',scheduleIds:[A,B],...extra})}) as any,{params:Promise.resolve({slug:'evento-generico'})});
describe('Registro de acompañante nativo sin parche por evento',()=>{
 let tx:any,event:any,person:any;
 beforeEach(()=>{
  jest.clearAllMocks();tx={commit:jest.fn(),rollback:jest.fn(),LOCK:{UPDATE:'UPDATE'}};(sequelize.transaction as jest.Mock).mockResolvedValue(tx);
  event={id:'otro-evento',registrationOpen:true,allowMultipleSchedules:true,allowGuests:false,maxCapacity:0,maxGuestsPerParticipant:0,createdBy:'admin',registrationConfig:{mode:'open',guests:{mode:'named',adultCompanionEnabled:true,preloadedOnly:true}}};
  (Event.findOne as jest.Mock).mockImplementation(async()=>event);
  (EventSchedule.findAll as jest.Mock).mockResolvedValue([{id:A},{id:B}]);(Guest.count as jest.Mock).mockResolvedValue(0);
  (Participant.findOne as jest.Mock).mockResolvedValue(null);
  (Participant.create as jest.Mock).mockImplementation(async values=>{
   person={id:PID,...values,getSchedules:jest.fn().mockResolvedValue([]),addSchedules:jest.fn(),update:jest.fn().mockImplementation(async patch=>Object.assign(person,patch))};return person;
  });
 });
 afterEach(()=>jest.restoreAllMocks());
 test('guarda un adulto en una fecha y ninguno en la otra, aunque no permita altas con nombre',async()=>{
  const res=await call({adultCompanionsBySchedule:{[A]:true,[B]:false}});
  expect(res.status).toBe(201);expect(person.customData[KEY]).toEqual({[A]:true,[B]:false});
  expect(person.guestCount).toBe(0);expect(Guest.create).not.toHaveBeenCalled();
  expect(Event.findByPk).toHaveBeenCalledWith(event.id,expect.objectContaining({transaction:tx,lock:'UPDATE'}));
 });
 test('no admite responder por una fecha ajena',async()=>{
  const res=await call({adultCompanionsBySchedule:{'33333333-3333-4333-a333-333333333333':true}});
  expect(res.status).toBe(400);expect(tx.rollback).toHaveBeenCalled();expect(tx.commit).not.toHaveBeenCalled();
 });
 test('agregar una fecha mantiene la anterior y las preguntas guardadas',async()=>{
  person={id:PID,customData:{q:{enabled:true},[KEY]:{[A]:true}},guestCount:0,getSchedules:jest.fn().mockResolvedValue([{id:A}]),addSchedules:jest.fn(),update:jest.fn().mockImplementation(async patch=>Object.assign(person,patch))};
  (Participant.findOne as jest.Mock).mockResolvedValue(person);(EventSchedule.findAll as jest.Mock).mockResolvedValue([{id:B}]);
  const res=await call({scheduleIds:[B],adultCompanionsBySchedule:{[B]:false},customData:{q:{enabled:false}}});
  expect(res.status).toBe(201);expect(person.customData).toEqual({q:{enabled:true},[KEY]:{[A]:true,[B]:false}});
 });
 test('el adulto puede coexistir con una carga seleccionada por id',async()=>{
  jest.spyOn(GuestSchedule,'findOrCreate').mockResolvedValue([{} as any,true]);
  const guest={id:PID,update:jest.fn()};(Guest.findOne as jest.Mock).mockResolvedValue(guest);
  const res=await call({adultCompanionsBySchedule:{[A]:true},guestsBySchedule:{[A]:[{id:PID}],[B]:[]}});
  expect(res.status).toBe(201);expect(GuestSchedule.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({where:{guestId:PID,scheduleId:A}}));
  expect(person.customData[KEY][A]).toBe(true);
 });
 test('sin activar la opción, no crea metadata ni acepta inyectarla por customData',async()=>{
  event.registrationConfig.guests.adultCompanionEnabled=false;
  const res=await call({adultCompanionsBySchedule:{[A]:true},customData:{[KEY]:{[A]:true}}});
  expect(res.status).toBe(201);expect(person.customData?.[KEY]).toBeUndefined();
 });
 test('Ya estás inscrito devuelve las respuestas guardadas sin actualizarlas',async()=>{
  event.allowMultipleSchedules=false;event.registrationConfig.customQuestions=[{key:'q',label:'Transporte'}];
  const saved={id:PID,firstName:'Nombre guardado',customData:{q:{enabled:true,value:'Bus Norte'},[KEY]:{[A]:true}},guestCount:0};
  person={...saved,get:()=>saved,getSchedules:jest.fn().mockResolvedValue([{id:A,scheduleName:'Mañana'}]),update:jest.fn()};
  (Participant.findOne as jest.Mock).mockResolvedValue(person);(Guest.findAll as jest.Mock).mockResolvedValue([]);
  const res=await call({customData:{q:{enabled:false}},adultCompanionsBySchedule:{[A]:false}});const result=await res.json();
  expect(res.status).toBe(409);expect(result.registrationSummary.participantName).toBe('Nombre guardado');
  expect(result.registrationSummary.answers[0].text).toBe('Bus Norte');expect(person.update).not.toHaveBeenCalled();
 });
 test('por RUT solo guarda las fechas nuevas',async()=>{
  event.registrationConfig.mode='rut';person={id:PID,customData:{},guestCount:0,getSchedules:jest.fn().mockResolvedValue([]),addSchedules:jest.fn(),update:jest.fn().mockImplementation(async patch=>Object.assign(person,patch))};
  (Participant.findOne as jest.Mock).mockResolvedValue(person);
  const res=await call({participantId:PID,adultCompanionsBySchedule:{[A]:false,[B]:true}});
  expect(res.status).toBe(201);expect(person.customData[KEY]).toEqual({[A]:false,[B]:true});
 });
});
