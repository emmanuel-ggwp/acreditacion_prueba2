import Fields,{GuestInstructions} from '../GuestCompanionFields';
const nodes=(t:any):any[]=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
const text=(t:any):string=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.props?.children):String(t);
describe('Pregunta real de acompañante por fecha',()=>{
 const config={guests:{mode:'named',adultCompanionEnabled:true,title:'¿Trae a su pareja?',helpText:'No duplique a su cónyuge.\nUse solo una entrada.'}};
 const schedules=[{id:'a',scheduleName:'Mañana',startDateTime:'2026-12-03T14:00:00Z'},{id:'b',scheduleName:'Tarde',startDateTime:'2026-12-04T14:00:00Z'}];
 test('muestra el mensaje, conserva el otro día y permite responder Sí o No',()=>{
  const onChange=jest.fn();const tree=Fields({config,schedules,answers:{a:false,b:true},onChange});
  expect(text(tree)).toContain('No duplique a su cónyuge');expect(text(tree)).toContain('Tarde');
  const radios=nodes(tree).filter(n=>n.type==='input');expect(radios.map(n=>n.props.checked)).toEqual([false,true,true,false]);
  radios[0].props.onChange();expect(onChange).toHaveBeenCalledWith({a:true,b:true});
 });
 test('las fechas ya inscritas son solo lectura y los eventos viejos no muestran la opción',()=>{
  const tree=Fields({config,schedules,answers:{a:true},onChange:jest.fn(),lockedIds:['a']});
  expect(nodes(tree).filter(n=>n.type==='fieldset').map(n=>n.props.disabled)).toEqual([true,false]);
  expect(Fields({config:{},schedules,answers:{},onChange:jest.fn()})).toBeNull();
 });
 test('el mensaje también se puede usar en el modo numérico normal',()=>{
  expect(text(GuestInstructions({config:{guests:{mode:'count',title:'Invitados',helpText:'Incluya solo quienes asistirán.'}}}))).toContain('Incluya solo quienes asistirán');
 });
});
