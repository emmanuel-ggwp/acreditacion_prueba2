jest.mock('@/store/eventStore',()=>({__esModule:true,default:jest.fn()}));
jest.mock('@/store/authStore',()=>({__esModule:true,default:jest.fn()}));
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn()})}));
jest.mock('../../auth/RoleGuard',()=>({__esModule:true,default:()=>null}),{virtual:true});
jest.mock('@/components/events/ScheduleForm',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/events/ScheduleImageManager',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/events/ScheduleList',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/participants/ParticipantList',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/accreditation/AccreditationPanel',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/reports/EventReport',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/events/EventAccreditationHistory',()=>({__esModule:true,default:()=>null}));
jest.mock('../EventForm',()=>({__esModule:true,default:()=>null}),{virtual:true});
jest.mock('../EventAwardedList',()=>({__esModule:true,default:()=>null}),{virtual:true});
jest.mock('@/utils/generateReport',()=>({downloadEventGeneralReport:jest.fn().mockResolvedValue(undefined),downloadEventGuestsReport:jest.fn()}));
import React from 'react';
import Card from '../EventCard';
const Schedules = jest.requireActual('../ScheduleList').default;
import Details from '../EventDetails';
import useEvent from '@/store/eventStore';
import useAuth from '@/store/authStore';
import {downloadEventGeneralReport} from '@/utils/generateReport';
const nodes=(t:any):any[]=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const text=(t:any):string=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.props?.children):String(t);
describe('Claridad de eventos, horarios y descargas',()=>{
 let event:any,state:any;
 beforeEach(()=>{
  event={id:'e',name:'Prueba',isPublic:false,allowGuests:false,participantCount:10,registeredGuestCount:24,accreditedCount:3,accreditedGuestCount:8,maxCapacity:100,schedules:[],registrationConfig:{guests:{mode:'named',preloadedOnly:true}}};
  state={currentEvent:event,EventSchedules:[{id:'s',scheduleName:'Turno',startDateTime:'2026-11-14T13:00:00Z',endDateTime:'2026-11-14T17:00:00Z',status:'accredited'}],fetchEventById:jest.fn(),fetchSchedulesForEvent:jest.fn(),loading:false};
  (useEvent as unknown as jest.Mock).mockImplementation(selector=>selector?selector(state):state);
  (useAuth as unknown as jest.Mock).mockImplementation(selector=>selector?selector({user:{role:'ADMIN'}}):{user:{role:'ADMIN'}});
  jest.spyOn(React,'useState').mockImplementation(((initial:any)=>[typeof initial==='function'?initial():initial,jest.fn()]) as any);
  jest.spyOn(React,'useEffect').mockImplementation(()=>{});
  jest.spyOn(React,'useMemo').mockImplementation(fn=>fn());
 });
 afterEach(()=>jest.restoreAllMocks());
 test('la tarjeta muestra total de personas y desglose, con cupo exclusivo de titulares',()=>{
  const tree=Card({event});const output=text(tree);
  expect(output).toContain('34');expect(output).toContain('11');expect(output).toContain('10 titulares · 24 invitados');expect(output).toContain('3 titulares · 8 invitados');
  expect(output).toContain('Cupo titulares');expect(output).toContain('No publicado');expect(output).not.toContain('Borrador');
 });
 test('los horarios incluyen el día y la hora de Chile',()=>{
  const output=text(Schedules({eventId:'e'}));expect(output).toContain('14');expect(output).toContain('2026');expect(output).toMatch(/10:00/);expect(output).toMatch(/02:00|14:00/);
 });
 test('información aclara los precargados y descarga Excel con el helper común',async()=>{
  const tree=Details({eventId:'e'});expect(text(tree)).toContain('Solo invitados precargados');
  expect(text(tree)).toContain('asistencias ya registradas se conservan');
  await nodes(tree).find(n=>n.type==='button'&&text(n).trim()==='Reporte').props.onClick();
  expect(downloadEventGeneralReport).toHaveBeenCalledWith('e','Prueba');
 });
});
