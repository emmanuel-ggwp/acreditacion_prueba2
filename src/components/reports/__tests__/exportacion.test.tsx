jest.mock('@/utils/apiClient',()=>({__esModule:true,default:{get:jest.fn()}}));
jest.mock('@/utils/generateReport',()=>({downloadEventAccreditedReport:jest.fn().mockResolvedValue(undefined)}));
jest.mock('@/components/ui/Toast',()=>({showToast:{error:jest.fn()}}));
jest.mock('recharts',()=>Object.fromEntries(['BarChart','Bar','XAxis','YAxis','CartesianGrid','Tooltip','Legend','ResponsiveContainer','LineChart','Line'].map(key=>[key,key])));
import React from 'react';
import EventReport from '../EventReport';
import apiClient from '@/utils/apiClient';
import { downloadEventAccreditedReport } from '@/utils/generateReport';
import { showToast } from '@/components/ui/Toast';
const nodes=(tree:any):any[]=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];
const text=(tree:any):string=>Array.isArray(tree)?tree.map(text).join(''):tree==null||typeof tree==='boolean'?'':typeof tree==='object'?text(tree.props?.children):String(tree);
describe('Pantalla Reportes: descarga nueva y actualización',()=>{
  let state:any[],cursor:number,effects:any[];
  const data={eventInfo:{name:'Escondida'},participantStats:{totalRegistered:5,totalAccredited:5,registered:1,registeredGuests:4,accredited:1,accreditedGuests:4},scheduleStats:[],awardStats:{assigned:0,delivered:0},accreditationTimeline:[]};
  const render=()=>{cursor=0;return EventReport({eventId:'e'});};
  beforeEach(()=>{
    jest.clearAllMocks();state=[data,[],false,null,null,false,null];effects=[];
    jest.spyOn(React,'useState').mockImplementation((()=>{const index=cursor++;return [state[index],(next:any)=>state[index]=typeof next==='function'?next(state[index]):next];}) as any);
    jest.spyOn(React,'useEffect').mockImplementation(effect=>{effects.push(effect);});
    (apiClient.get as jest.Mock).mockImplementation(async url=>url.includes('/export')?[]:data);
  });
  afterEach(()=>{jest.restoreAllMocks();jest.useRealTimers();});
  test('el botón descarga del servidor aunque no se haya cargado el padrón de dietas',async()=>{
    const button=nodes(render()).find(n=>n.type==='button'&&text(n).includes('Descargar acreditados'));
    expect(button.props.disabled).toBe(false);
    await button.props.onClick();
    expect(downloadEventAccreditedReport).toHaveBeenCalledWith('e','Escondida');
    expect(state[5]).toBe(false);
  });
  test('informa fallos de descarga y permite reintentar',async()=>{
    (downloadEventAccreditedReport as jest.Mock).mockRejectedValueOnce(new Error('red'));
    await nodes(render()).find(n=>n.type==='button'&&text(n).includes('Descargar acreditados')).props.onClick();
    expect(showToast.error).toHaveBeenCalled();expect(state[5]).toBe(false);
  });
  test('recarga periódicamente y deja de consultar al salir',async()=>{
    jest.useFakeTimers();render();const cleanup=effects[0]();
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect((apiClient.get as jest.Mock).mock.calls.filter(([url])=>url.includes('/api/reports/'))).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(20000);
    expect((apiClient.get as jest.Mock).mock.calls.filter(([url])=>url.includes('/api/reports/'))).toHaveLength(2);
    expect((apiClient.get as jest.Mock).mock.calls.filter(([url])=>url.includes('/export'))).toHaveLength(1);
    cleanup();await jest.advanceTimersByTimeAsync(20000);
    expect((apiClient.get as jest.Mock).mock.calls.filter(([url])=>url.includes('/api/reports/'))).toHaveLength(2);
  });
});
