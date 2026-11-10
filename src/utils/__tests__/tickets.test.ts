import { registrationConfigSchema, updateEventSchema } from '../validators/eventSchemas';
import { getTicketLimit } from '../tickets';

describe('configuración de tickets', () => {
  it.each([null, {}, { tickets: { maxPerParticipant: 0 } }, { tickets: { maxPerParticipant: '5' } }])('mantiene desactivada la opción sin un tope numérico válido: %s', (config) => {
    expect(getTicketLimit(config)).toBe(0);
  });
  it('conserva los demás campos al agregar tickets', () => {
    const config = { guests: { mode: 'companion' }, tickets: { maxPerParticipant: 5 }, dietaryOptions: ['Vegano'] };
    expect(registrationConfigSchema.parse(config)).toMatchObject(config);
    expect(getTicketLimit(config)).toBe(5);
  });
  it.each([-1, 0.5, 10001, '5'])('rechaza topes inválidos: %s', (maxPerParticipant) => {
    expect(registrationConfigSchema.safeParse({ tickets: { maxPerParticipant } }).success).toBe(false);
  });
  it('una edición parcial del evento no agrega ni cambia configuración', () => {
    expect(updateEventSchema.parse({ name: 'Evento editado' })).toEqual({ name: 'Evento editado' });
  });
});
