jest.mock('@/utils/apiClient',()=>({__esModule:true,default:{get:jest.fn()}}));
jest.mock('@/store/eventStore',()=>({__esModule:true,default:jest.fn()}));
jest.mock('../../events/ButtonEventReport',()=>({ButtonEventReport:()=>null}));
jest.mock('../DashboardHero',()=>({__esModule:true,default:()=>null}));
import React from 'react';
import Dashboard from '../DashboardStats';
import apiClient from '@/utils/apiClient';
import store from '@/store/eventStore';
const text=(t:any):string=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.props?.children):String(t);
const nodes=(t:any):any[]=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
describe('Panel: errores de reportes visibles',()=>{
 let state:any[],cursor:number,effects:any[];
 const render=()=>{cursor=0;effects=[];return Dashboard({});};
 beforeEach(()=>{
  jest.clearAllMocks();state=[[],false,null,0,'date',1,null];
  (store as unknown as jest.Mock).mockReturnValue({events:[{id:'e',name:'Centinela'}],total:1,loading:false,error:null,fetchEvents:jest.fn()});
  jest.spyOn(React,'useState').mockImplementation((()=>{const index=cursor++;return [state[index],(v:any)=>{state[index]=typeof v==='function'?v(state[index]):v;}];}) as any);
  jest.spyOn(React,'useEffect').mockImplementation(fn=>{effects.push(fn);});
 });
 afterEach(()=>jest.restoreAllMocks());
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 test('un fallo muestra aviso y reintento, sin decir que no hay eventos',async()=>{
  (apiClient.get as jest.Mock).mockRejectedValue(new Error('fallo'));
  render();effects[3]();await flush();
  const tree=render();expect(text(tree)).toContain('No se pudieron cargar las estadísticas');
  expect(text(tree)).not.toContain('No se encontraron eventos');
  nodes(tree).find(n=>n.type==='button'&&text(n)==='Reintentar').props.onClick();expect(state[3]).toBe(1);
 });
 test('una respuesta parcial identifica el evento cuyo reporte falta',async()=>{
  (apiClient.get as jest.Mock).mockResolvedValue([]);
  render();effects[3]();await flush();expect(text(render())).toContain('Centinela.');
 });
 test('una respuesta vieja no reemplaza la página actual',async()=>{
  let resolve:any;(apiClient.get as jest.Mock).mockImplementation(()=>new Promise(r=>resolve=r));
  render();const cleanup=effects[3]();cleanup();resolve([]);await flush();expect(state[2]).toBe(null);
 });
});
