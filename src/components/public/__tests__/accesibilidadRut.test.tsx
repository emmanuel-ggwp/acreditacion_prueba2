jest.mock('@/lib/emailjs',()=>({sendConfirmationEmail:jest.fn()}));
import React from 'react';
import Gala from '../templates/GalaTemplate';
const nodes=(t:any):any[]=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const text=(t:any):string=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.props?.children):String(t);
describe('Acceso por RUT: etiqueta y anuncio de errores',()=>{
 test('asocia el campo a RUT y al error sin enviar una consulta vacía',async()=>{
  let state:any[]=[],cursor=0;
  jest.spyOn(React,'useState').mockImplementation(((initial:any)=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],(v:any)=>state[i]=typeof v==='function'?v(state[i]):v];}) as any);
  const event:any={id:'e',name:'Prueba',schedules:[],registrationConfig:{mode:'rut'}};
  const render=()=>{cursor=0;return Gala({event,slug:'prueba'});};
  try{
   let tree=render();nodes(tree).find(n=>n.type==='button'&&text(n).includes('Entrar')).props.onClick();tree=render();
   const input=nodes(tree).find(n=>n.type==='input');expect(input.props.id).toBe('gala-rut');
   expect(nodes(tree).find(n=>n.type==='label'&&n.props.htmlFor===input.props.id)).toBeDefined();
   await nodes(tree).find(n=>n.type==='button'&&text(n).includes('Continuar')).props.onClick();tree=render();
   const invalid=nodes(tree).find(n=>n.type==='input');expect(invalid.props['aria-invalid']).toBe(true);
   expect(nodes(tree).find(n=>n.props?.id===invalid.props['aria-describedby']&&n.props.role==='alert')).toBeDefined();
  }finally{jest.restoreAllMocks();}
 });
});
