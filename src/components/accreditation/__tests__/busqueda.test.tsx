jest.mock('@/store/participantStore',()=>({__esModule:true,default:jest.fn()}));
import React from 'react';
import Search from '../SearchParticipant';
import useStore from '@/store/participantStore';
const nodes=(t:any):any[]=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const text=(t:any):string=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.props?.children):String(t);
describe('Buscador de acreditación: errores, reintento y respuestas lentas',()=>{
 let state:any[],cursor:number,refs:any[],refCursor:number,memo:any,effect:any,effectDeps:any[],cleanup:any,lookup:jest.Mock;
 const same=(a:any[],b:any[])=>a&&b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
 const render=()=>{cursor=0;refCursor=0;const tree=Search({eventId:'e',scheduleId:'s',onSelect:jest.fn()});if(effect){const fn=effect;effect=null;cleanup?.();cleanup=fn();}return tree;};
 const type=(value:string)=>{nodes(render()).find(n=>n.type==='input').props.onChange({target:{value}});render();};
 beforeEach(()=>{
  jest.useFakeTimers();state=[];refs=[];memo=null;effect=null;effectDeps=[];cleanup=null;lookup=jest.fn().mockResolvedValue([]);
  (useStore as unknown as jest.Mock).mockReturnValue({searchParticipants:lookup});
  jest.spyOn(React,'useState').mockImplementation(((initial:any)=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],(v:any)=>state[i]=typeof v==='function'?v(state[i]):v];}) as any);
  jest.spyOn(React,'useRef').mockImplementation(((initial:any)=>{const i=refCursor++;return refs[i]||(refs[i]={current:initial});}) as any);
  jest.spyOn(React,'useMemo').mockImplementation(((fn:any,deps:any[])=>{if(!memo||!same(deps,memo.deps))memo={deps,value:fn()};return memo.value;}) as any);
  jest.spyOn(React,'useEffect').mockImplementation(((fn:any,deps:any[])=>{if(!same(deps,effectDeps)){effectDeps=deps;effect=fn;}}) as any);
 });
 afterEach(()=>{cleanup?.();jest.restoreAllMocks();jest.useRealTimers();});
 test('un fallo se anuncia y ofrece reintento sin decir que no existen personas',async()=>{
  lookup.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce([{id:'p',firstName:'Persona',lastName:'Prueba'}]);
  type('persona');await jest.advanceTimersByTimeAsync(400);let tree=render();
  expect(nodes(tree).some(n=>n.props?.role==='alert')).toBe(true);expect(text(tree)).not.toContain('No se encontraron resultados');
  nodes(tree).find(n=>n.type==='button'&&text(n)==='Reintentar búsqueda').props.onClick();await Promise.resolve();await Promise.resolve();
  tree=render();expect(text(tree)).toContain('Persona Prueba');expect(text(tree)).not.toContain('No se pudo consultar');expect(lookup).toHaveBeenCalledTimes(2);
 });
 test('ignora una respuesta anterior incluso antes de que termine el debounce nuevo',async()=>{
  let resolve!:(v:any)=>void;lookup.mockReturnValueOnce(new Promise(r=>resolve=r)).mockResolvedValueOnce([{id:'b',firstName:'Nuevo'}]);
  type('anterior');await jest.advanceTimersByTimeAsync(400);type('nueva');resolve([{id:'a',firstName:'Viejo'}]);await Promise.resolve();await Promise.resolve();
  expect(text(render())).not.toContain('Viejo');await jest.advanceTimersByTimeAsync(400);expect(text(render())).toContain('Nuevo');
 });
 test('distingue una búsqueda correcta vacía y etiqueta el campo accesiblemente',async()=>{
  type('nadie');await jest.advanceTimersByTimeAsync(400);expect(text(render())).toContain('No se encontraron resultados');
  expect(nodes(render()).find(n=>n.type==='input').props['aria-label']).toContain('RUT');
 });
 test('limpiar invalida respuestas pendientes y no consulta textos cortos',async()=>{
  let resolve!:(v:any)=>void;lookup.mockReturnValue(new Promise(r=>resolve=r));type('persona');await jest.advanceTimersByTimeAsync(400);
  nodes(render()).find(n=>n.props?.['aria-label']==='Limpiar búsqueda').props.onClick();render();resolve([{id:'p',firstName:'Viejo'}]);await jest.advanceTimersByTimeAsync(400);
  expect(text(render())).not.toContain('Viejo');expect(lookup).toHaveBeenCalledTimes(1);
 });
});
