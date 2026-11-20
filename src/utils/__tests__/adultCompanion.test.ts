import { ADULT_COMPANIONS_KEY as KEY, adultCompanionEnabled, adultCompanionAnswers, adultCompanionForDate, addAdultCompanionDates, numericGuestsForDateSql } from '../adultCompanion';
import { guestsConfigSchema } from '../validators/eventSchemas';
describe('Acompañante nativo por fecha',()=>{
 test('es opcional y solo aplica a invitados con nombre',()=>{
  expect(adultCompanionEnabled({})).toBe(false);
  expect(adultCompanionEnabled({guests:{mode:'count',adultCompanionEnabled:true}})).toBe(false);
  expect(adultCompanionEnabled({guests:{mode:'named',adultCompanionEnabled:true}})).toBe(true);
 });
 test('guarda Sí y No por separado sin reemplazar fechas ni preguntas anteriores',()=>{
  const value=addAdultCompanionDates({q:{enabled:true},[KEY]:{a:true}},['a','b'],{a:false,b:false});
  expect(value).toEqual({q:{enabled:true},[KEY]:{a:true,b:false}});
  expect(adultCompanionForDate(value,'a')).toBe(true);
  expect(adultCompanionForDate(value,'b')).toBe(false);
  expect(adultCompanionForDate(value,'c')).toBe(null);
 });
 test('no interpreta cadenas o números como respuestas',()=>{
  expect(adultCompanionAnswers({[KEY]:{a:'false',b:1,c:false}})).toEqual({c:false});
 });
 test('la configuración conserva el mensaje y limita su longitud',()=>{
  const config=guestsConfigSchema.parse({title:'¿Asiste con acompañante?',helpText:'Solo si su pareja no está en la nómina.',adultCompanionEnabled:true});
  expect(config.adultCompanionEnabled).toBe(true);expect(config.helpText).toContain('pareja');
  expect(guestsConfigSchema.safeParse({helpText:'x'.repeat(1501)}).success).toBe(false);
 });
 test('la consulta usa la respuesta de cada fecha y conserva el valor antiguo como fallback',()=>{
  expect(numericGuestsForDateSql('p','ps.schedule_id')).toContain("jsonb_typeof");
  expect(numericGuestsForDateSql('p','ps.schedule_id')).toContain('COALESCE(p.guest_count,0)');
 });
});
