jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()})}));
jest.mock('react-hook-form',()=>({useForm:()=>({register:jest.fn(),handleSubmit:(fn:any)=>fn,watch:()=>[],setValue:jest.fn(),getValues:()=>({}),formState:{errors:{}}})}));
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Gala from '../templates/GalaTemplate';
import Form from '../PublicRegistrationForm';
const summary:any={participantName:'Nombre guardado en servidor',answers:[{label:'Transporte',text:'Bus elegido'}],dietary:null,dates:[{id:'s',name:'Fecha inscrita',start:'2026-12-03T14:00:00Z',end:null,guests:[{name:'Hija seleccionada',type:'Hijo'}],numericGuests:1,adultCompanion:true,numericLoads:null,totalGuests:2}]};
const event:any={id:'e',name:'Evento',registrationConfig:{mode:'rut'},schedules:[{id:'s',scheduleName:'Fecha inscrita',startDateTime:'2026-12-03T14:00:00Z',endDateTime:'2026-12-03T18:00:00Z'}]};
describe('Pantallas de inscripción existente en ambas plantillas',()=>{
 afterEach(()=>jest.restoreAllMocks());
 test('Gala muestra el resumen del servidor y mantiene la pantalla en solo lectura',()=>{
  let index=0;
  jest.spyOn(React,'useState').mockImplementation(((initial:any)=>{
   const i=index++;return [i===4?summary:i===5?'already':typeof initial==='function'?initial():initial,jest.fn()];
  }) as any);
  const html=renderToStaticMarkup(Gala({event,slug:'evento'}));
  expect(html).toContain('Ya estás inscrito');expect(html).toContain('Nombre guardado en servidor');expect(html).toContain('Bus elegido');expect(html).toContain('Hija seleccionada');expect(html).not.toContain('<input');
 });
 test('la plantilla normal también muestra respuestas e invitados guardados',()=>{
  let index=0;
  jest.spyOn(React,'useState').mockImplementation(((initial:any)=>{
   const i=index++;return [i===2?true:i===3?summary:typeof initial==='function'?initial():initial,jest.fn()];
  }) as any);
  jest.spyOn(React,'useEffect').mockImplementation(()=>{});
  const html=renderToStaticMarkup(Form({event,slug:'evento'}));
  expect(html).toContain('Ya estás inscrito');expect(html).toContain('Bus elegido');expect(html).toContain('Hija seleccionada');expect(html).toContain('Total de invitados en esta fecha');expect(html).not.toContain('<input');
 });
});
