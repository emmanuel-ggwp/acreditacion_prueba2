jest.mock('@/services/auditLogService',()=>({auditLogService:{log:jest.fn()}}));
import {AccreditationService} from '../accreditationService';
import {Accreditation,Guest,Participant,EventSchedule} from '@/models/index';
import {sequelize} from '@/lib/sequelize';
import {auditLogService} from '@/services/auditLogService';
describe('Correcciones de asistencia completas o revertidas',()=>{
 let stored:{present:boolean;count:number},tx:any;
 const service=new AccreditationService();
 beforeEach(()=>{
  jest.resetAllMocks();stored={present:true,count:3};tx={LOCK:{UPDATE:'UPDATE'},commit:jest.fn(),rollback:jest.fn()};
  (sequelize.transaction as jest.Mock).mockImplementation(async callback=>{
   const before={...stored};
   try {const result=await callback(tx);await tx.commit();return result;}
   catch(error){Object.assign(stored,before);await tx.rollback();throw error;}
  });
  (Accreditation.destroy as jest.Mock).mockImplementation(async()=>{stored.present=false;return 1;});
  (Guest.findByPk as jest.Mock).mockResolvedValue({id:'g',firstName:'Invitado'});
  (Participant.findByPk as jest.Mock).mockResolvedValue({id:'p',firstName:'Titular'});
  (EventSchedule.findByPk as jest.Mock).mockResolvedValue({id:'s',eventId:'e'});
  (Accreditation.findOne as jest.Mock).mockImplementation(async()=>({id:'a',guestCount:stored.count,update:jest.fn(async(values,options)=>{
   expect(options.transaction).toBe(tx);stored.count=values.guestCount;
  })}));
 });
 test('desmarcar revierte la eliminación si falla la lectura posterior del invitado',async()=>{
  (Guest.findByPk as jest.Mock).mockRejectedValue(new Error('Error de lectura'));
  await expect(service.unaccreditGuest('g','s','operator')).rejects.toThrow('Error de lectura');
  expect(stored.present).toBe(true);expect(tx.rollback).toHaveBeenCalled();expect(tx.commit).not.toHaveBeenCalled();expect(auditLogService.log).not.toHaveBeenCalled();
  expect(Accreditation.destroy).toHaveBeenCalledWith({where:{guestId:'g',eventScheduleId:'s'},transaction:tx});
 });
 test('desmarcar revierte si falla la lectura del horario o la confirmación',async()=>{
  (EventSchedule.findByPk as jest.Mock).mockRejectedValue(new Error('Horario no disponible'));
  await expect(service.unaccreditGuest('g','s','operator')).rejects.toThrow('Horario no disponible');expect(stored.present).toBe(true);
 });
 test('corregir la cantidad revierte el cambio si falla una lectura posterior',async()=>{
  (Participant.findByPk as jest.Mock).mockRejectedValue(new Error('Error de lectura'));
  await expect(service.setAccreditationGuestCount('p','s',1,'operator')).rejects.toThrow('Error de lectura');
  expect(stored.count).toBe(3);expect(tx.rollback).toHaveBeenCalled();expect(auditLogService.log).not.toHaveBeenCalled();
  expect(Accreditation.findOne).toHaveBeenCalledWith({where:{participantId:'p',eventScheduleId:'s'},transaction:tx,lock:'UPDATE'});
 });
 test('un fallo al confirmar revierte la cantidad y no registra éxito en auditoría',async()=>{
  tx.commit.mockRejectedValue(new Error('No se pudo confirmar'));
  await expect(service.setAccreditationGuestCount('p','s',1,'operator')).rejects.toThrow('No se pudo confirmar');
  expect(stored.count).toBe(3);expect(auditLogService.log).not.toHaveBeenCalled();
 });
 test('elimina solo el invitado solicitado y audita después de confirmar',async()=>{
  await expect(service.unaccreditGuest('g','s','operator')).resolves.toEqual({removed:1});
  expect(stored.present).toBe(false);expect(tx.commit).toHaveBeenCalled();expect(tx.rollback).not.toHaveBeenCalled();
  expect(tx.commit.mock.invocationCallOrder[0]).toBeLessThan((auditLogService.log as jest.Mock).mock.invocationCallOrder[0]);
  expect(Guest.findByPk).toHaveBeenCalledWith('g',expect.objectContaining({transaction:tx}));expect(EventSchedule.findByPk).toHaveBeenCalledWith('s',{transaction:tx});
 });
 test('guarda la cantidad y registra antes/después una vez confirmada',async()=>{
  await service.setAccreditationGuestCount('p','s',1,'operator');expect(stored.count).toBe(1);
  expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({details:expect.objectContaining({changes:{invitados:{from:3,to:1}}})}));
  expect(tx.commit.mock.invocationCallOrder[0]).toBeLessThan((auditLogService.log as jest.Mock).mock.invocationCallOrder[0]);
 });
});
