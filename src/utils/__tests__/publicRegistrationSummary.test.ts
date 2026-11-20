import {buildPublicRegistrationSummary as build} from '../publicRegistrationSummary';
describe('Resumen público usa inscripciones guardadas',()=>{
 const event={id:'e',registrationConfig:{guests:{mode:'named'},customQuestions:[{key:'transport',label:'¿Necesita transporte?'},{key:'other',label:'Otra pregunta'}]}};
 const person={firstName:'Ana',lastName:'Pérez',guestCount:0,customData:{transport:{enabled:true,value:'Bus Norte'},other:{enabled:false},secret:{enabled:true,value:'no exponer'},_adultCompanionsBySchedule:{a:true,b:false}},
  schedules:[{id:'a',scheduleName:'Mañana',startDateTime:'2026-12-03T14:00:00Z'},{id:'b',scheduleName:'Tarde',startDateTime:'2026-12-04T14:00:00Z'}],
  guests:[{id:'g1',firstName:'Hija seleccionada',guestType:'Hijo',documentNumber:'NO MOSTRAR'},{id:'g2',firstName:'Precargado sin seleccionar',confirmed:false},{id:'g3',firstName:'Invitado fecha B',registrationSource:'PUBLIC_FORM'},{id:'g4',firstName:'Legado confirmado',confirmed:true}]};
 test('solo muestra invitados seleccionados, por fecha, incluyendo los creados desde la landing',()=>{
  const summary=build(event,person,[{guestId:'g1',scheduleId:'a'},{guestId:'g3',scheduleId:'b'}]);
  expect(summary.dates[0].guests.map(g=>g.name)).toEqual(['Hija seleccionada','Legado confirmado']);
  expect(summary.dates[1].guests.map(g=>g.name)).toEqual(['Invitado fecha B','Legado confirmado']);
  expect(summary.dates.map(d=>d.adultCompanion)).toEqual([true,false]);
  expect(summary.dates.map(d=>d.totalGuests)).toEqual([3,2]);
  expect(JSON.stringify(summary)).not.toContain('NO MOSTRAR');expect(JSON.stringify(summary)).not.toContain('Precargado sin seleccionar');
 });
 test('no muestra metadata interna ni inventa respuestas para preguntas no contestadas',()=>{
  const summary=build(event,person,[]);expect(summary.answers).toEqual([{label:'¿Necesita transporte?',text:'Bus Norte'},{label:'Otra pregunta',text:'No'}]);
  expect(JSON.stringify(summary)).not.toContain('secret');expect(JSON.stringify(summary)).not.toContain('_adultCompanionsBySchedule');
  expect(build(event,{...person,customData:{}},[]).answers).toEqual([]);
 });
 test('los invitados asignados a otra fecha no entran por el fallback',()=>{
  const summary=build(event,{...person,guests:[{id:'g1',firstName:'Otra fecha',confirmed:true}]},[{guestId:'g1',scheduleId:'c'}]);
  expect(summary.dates.every(d=>d.guests.length===0)).toBe(true);
 });
 test('mantiene las declaraciones numéricas antiguas y no confunde inscripción con asistencia',()=>{
  const summary=build({registrationConfig:{guests:{mode:'companion'}}},{...person,customData:{},guestCount:3,guestCompanion:true,guestLoads:2,guests:[]},[]);
  expect(summary.dates[0]).toMatchObject({numericGuests:3,adultCompanion:true,numericLoads:2,totalGuests:3});
  expect(JSON.stringify(summary)).not.toContain('accredited');
 });
 test('no revela preferencias alimenticias cuando el campo está deshabilitado',()=>{
  expect(build(event,{...person,dietaryPreference:'VEGETARIAN'},[]).dietary).toBeNull();
 });
});
