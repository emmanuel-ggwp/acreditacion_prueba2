import Summary from '../RegisteredSummary';
const text=(t:any):string=>Array.isArray(t)?t.map(text).join(''):t==null||typeof t==='boolean'?'':typeof t==='object'?text(t.props?.children):String(t);
describe('Resumen visible de Ya estás inscrito',()=>{
 test('muestra respuestas, invitados y adulto de cada fecha',()=>{
  const summary:any={participantName:'Ana Pérez',answers:[{label:'Transporte',text:'Bus Norte'}],dietary:null,dates:[{id:'a',name:'La Serena',start:'2026-12-03T14:00:00Z',end:null,guests:[{name:'Hija seleccionada',type:'Hijo'}],numericGuests:1,adultCompanion:true,numericLoads:null,totalGuests:2}]};
  const output=text(Summary({summary,dark:true}));expect(output).toContain('Ana Pérez');expect(output).toContain('Bus Norte');expect(output).toContain('Hija seleccionada');expect(output).toContain('Sí · 1 adulto');expect(output).toContain('Total de invitados en esta fecha: 2');
 });
 test('si falta el detalle, avisa sin inventar que no hay invitados',()=>{
  const output=text(Summary({summary:null}));expect(output).toContain('no se pudo cargar');expect(output).not.toContain('Sin invitados inscritos');
 });
});
