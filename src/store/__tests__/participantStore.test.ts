jest.mock('@/utils/apiClient',()=>({__esModule:true,default:{get:jest.fn()}}));
jest.mock('../authStore',()=>({__esModule:true,default:{getState:()=>({})}}),{virtual:true});
import store from '../participantStore';
import api from '@/utils/apiClient';
const deferred=()=>{let resolve!:(value:any)=>void,reject!:(value:any)=>void;const promise=new Promise<any>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
describe('Listado de participantes: solo la respuesta vigente modifica la tabla',()=>{
 beforeEach(()=>{(api.get as jest.Mock).mockReset();store.setState({participants:[],total:0,loading:false,error:null});});
 test('ignora una respuesta anterior que llega después de la nueva',async()=>{
  const a=deferred(),b=deferred();(api.get as jest.Mock).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const first=store.getState().fetchParticipantsByEvent('e',1,10,{name:'anterior'}),last=store.getState().fetchParticipantsByEvent('e',1,10,{name:'nueva'});
  b.resolve({participants:[{id:'nuevo'}],total:1});await last;a.resolve({participants:[{id:'anterior'}],total:8});await first;
  expect(store.getState().participants[0].id).toBe('nuevo');expect(store.getState().total).toBe(1);
 });
 test('un error antiguo no interrumpe una consulta nueva en curso',async()=>{
  const a=deferred(),b=deferred();(api.get as jest.Mock).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const first=store.getState().fetchParticipantsByEvent('otro-evento'),last=store.getState().fetchParticipantsByEvent('actual');
  a.reject(new Error('antiguo'));await first;expect(store.getState().loading).toBe(true);expect(store.getState().error).toBeNull();
  b.resolve({participants:[{id:'actual'}],total:1});await last;expect(store.getState().participants[0].id).toBe('actual');
 });
 test('un fallo vigente muestra error y no deja filas de otra búsqueda',async()=>{
  store.setState({participants:[{id:'viejo'}] as any,total:1});(api.get as jest.Mock).mockRejectedValue(new Error('sin red'));
  await store.getState().fetchParticipantsByEvent('e');expect(store.getState()).toMatchObject({participants:[],total:0,loading:false,error:'sin red'});
 });
 test('propaga el fallo del buscador; una respuesta vacía válida sigue siendo vacía',async()=>{
  (api.get as jest.Mock).mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce({participants:[]});
  await expect(store.getState().searchParticipants('e','persona')).rejects.toThrow('sin red');
  await expect(store.getState().searchParticipants('e','persona')).resolves.toEqual([]);
 });
});
