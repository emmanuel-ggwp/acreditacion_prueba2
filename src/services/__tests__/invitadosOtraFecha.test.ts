import {ParticipantService} from '../participantService';
import {AccreditationService} from '../accreditationService';
import {Participant,Guest,Event,EventSchedule,GuestSchedule,ParticipantSchedule,Accreditation} from '@/models/index';
import {sequelize} from '@/lib/sequelize';
describe('Llegada en una fecha distinta a la inscripción',()=>{
 beforeEach(()=>jest.resetAllMocks());
 test('muestra cargas de las fechas originales, sin incluir precargadas sin elegir ni cambiar fechas',async()=>{
  const person={id:'p',schedules:[{id:'a',scheduleName:'Mañana'},{id:'b',scheduleName:'Tarde'}],customData:{_adultCompanionsBySchedule:{a:true,b:false}},guests:[
   {id:'child-a',schedules:[{id:'a'}]},{id:'child-b',schedules:[{id:'b'}]},
   {id:'unselected',confirmed:false,schedules:[]},{id:'legacy',confirmed:true,schedules:[]},
   {id:'unrelated-date',schedules:[{id:'x'}]}
  ]};
  (Participant.findAll as jest.Mock).mockResolvedValue([{get:()=>person}]);
  const result=await new ParticipantService().searchParticipants('e','Persona','c');
  expect(result[0].guests.map((g:any)=>g.id)).toEqual(['child-a','child-b','legacy']);
  expect(result[0].guests[0].accreditationSourceSchedules).toEqual([{id:'a',scheduleName:'Mañana'}]);
  expect(result[0].accreditationAdultCompanion).toBe(true);expect(result[0].guestCount).toBe(1);
  expect(result[0].schedules.map((s:any)=>s.id)).toEqual(['a','b']);
  expect(ParticipantSchedule.create).not.toHaveBeenCalled();expect(GuestSchedule.create).not.toHaveBeenCalled();
 });
 test('en una fecha inscrita mantiene el filtro de esa fecha',async()=>{
  const person={id:'p',schedules:[{id:'a'},{id:'b'}],guests:[{id:'a',schedules:[{id:'a'}]},{id:'b',schedules:[{id:'b'}]}]};
  (Participant.findAll as jest.Mock).mockResolvedValue([{get:()=>person}]);
  const result=await new ParticipantService().searchParticipants('e','Persona','b');
  expect(result[0].guests.map((g:any)=>g.id)).toEqual(['b']);
 });
 function setup(registrations:any[]){
  const service=new AccreditationService(),tx={LOCK:{UPDATE:'UPDATE'},commit:jest.fn(),rollback:jest.fn()};
  (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
  (EventSchedule.findByPk as jest.Mock).mockResolvedValue({id:'c',eventId:'e',isActive:true});
  (Event.findByPk as jest.Mock).mockResolvedValue({id:'e',isActive:true});
  (Guest.findByPk as jest.Mock).mockResolvedValue({id:'g',participantId:'p',participant:{id:'p',eventId:'e'}});
  (ParticipantSchedule.findAll as jest.Mock).mockResolvedValue(registrations);
  (GuestSchedule.count as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  (Accreditation.findOne as jest.Mock).mockResolvedValue(null);(Accreditation.create as jest.Mock).mockResolvedValue({id:'entry'});
  jest.spyOn(service,'getAccreditationById').mockResolvedValue({id:'entry'} as any);
  return {service,tx};
 }
 test('el servidor permite acreditar en la fecha actual sin mover las inscripciones',async()=>{
  const {service,tx}=setup([{scheduleId:'a'}]);
  await service.accreditGuest('g','c','operator');
  expect(Accreditation.create).toHaveBeenCalledWith(expect.objectContaining({guestId:'g',eventScheduleId:'c'}),expect.objectContaining({transaction:tx}));
  expect(GuestSchedule.create).not.toHaveBeenCalled();expect(GuestSchedule.destroy).not.toHaveBeenCalled();expect(ParticipantSchedule.create).not.toHaveBeenCalled();expect(tx.commit).toHaveBeenCalled();
 });
 test('el servidor sigue bloqueando invitados de otra fecha si el titular sí está inscrito aquí',async()=>{
  const {service,tx}=setup([{scheduleId:'a'},{scheduleId:'c'}]);
  await expect(service.accreditGuest('g','c','operator')).rejects.toThrow('no está registrado');
  expect(tx.rollback).toHaveBeenCalled();expect(Accreditation.create).not.toHaveBeenCalled();
 });
 test('la excepción no permite acreditar dos veces al mismo invitado en la fecha actual',async()=>{
  const {service}=setup([{scheduleId:'a'}]);(Accreditation.findOne as jest.Mock).mockResolvedValue({id:'existing'});
  await expect(service.accreditGuest('g','c','operator')).rejects.toThrow('already been accredited');
  expect(Accreditation.create).not.toHaveBeenCalled();
 });
 test('no habilita invitados sin una inscripción original del titular',async()=>{
  const {service}=setup([]);await expect(service.accreditGuest('g','c','operator')).rejects.toThrow('no está registrado');
 });
});
