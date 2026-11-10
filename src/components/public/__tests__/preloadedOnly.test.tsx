// Interacciones aisladas de los componentes: hooks y red controlados, sin BD.
jest.mock('@/lib/emailjs', () => ({ sendConfirmationEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('react-hook-form', () => ({ useForm: jest.fn() }));

import React from 'react';
import { useForm } from 'react-hook-form';
import { templates } from '@/components/public/templates';
import PublicRegistrationForm from '@/components/public/PublicRegistrationForm';

const SID = '11111111-1111-4111-a111-111111111111';
const GID = '77777777-7777-4777-a777-777777777777';
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree: any): string {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return text(tree.props?.children);
}

describe('Solo cargas precargadas en las cuatro plantillas', () => {
  let state: any[], cursor: number, values: any, tree: any, render: () => any;
  beforeEach(() => {
    state = []; cursor = 0; values = {};
    jest.spyOn(React, 'useState').mockImplementation(((initial: any) => {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (next: any) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    }) as any);
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    (useForm as jest.Mock).mockImplementation((options) => {
      if (!Object.keys(values).length) values = { ...options.defaultValues };
      return {
        register: (name: string) => ({ name, onChange: (e: any) => { values[name] = e.target.value; } }),
        watch: (name: string) => values[name],
        setValue: (name: string, value: any) => { values[name] = value; },
        handleSubmit: (fn: any) => () => fn(values), formState: { errors: {} },
      };
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({
      found: true, participant: { id: 'p1', firstName: 'Titular', lastName: 'Prueba', documentNumber: '12345678-9' },
      guests: [{ id: GID, firstName: 'Carga', lastName: 'Precargada' }],
      registeredScheduleIds: [], allowMultiple: true, guestCap: 0, guestsCreated: 0,
    }) });
  });
  afterEach(() => { jest.restoreAllMocks(); });

  const cases = Object.keys(templates).flatMap(template => [undefined, false, true].flatMap(option =>
    [0, 2].map(cap => ({ template, option, cap }))));
  it.each(cases)('$template: opción=$option, cupo=$cap conserva selección y controla botón/envío', async ({ template, option, cap }) => {
    const event: any = {
      id: 'ev1', name: 'Evento de prueba', allowGuests: true, maxGuestsPerParticipant: cap,
      allowMultipleSchedules: true, publicTemplate: template,
      schedules: [{ id: SID, scheduleName: 'Fecha de prueba', startDateTime: '2027-12-01T12:00:00Z', endDateTime: '2027-12-01T20:00:00Z' }],
      registrationConfig: { mode: 'rut', formFields: { email: { enabled: false }, phone: { enabled: false } },
        guests: { mode: 'named', ...(option === undefined ? {} : { preloadedOnly: option }), termSingular: 'Carga', termPlural: 'Cargas' } },
    };
    const Template = templates[template as keyof typeof templates];
    render = () => { cursor = 0; tree = Template({ event, slug: 'prueba' }); return tree; };
    render();
    if (template !== 'gala') {
      // Las tres plantillas deben pasar el evento intacto al formulario compartido.
      const form = nodes(tree).find(n => n.type === PublicRegistrationForm);
      expect(form?.props.event).toBe(event);
      state = [];
      render = () => { cursor = 0; tree = PublicRegistrationForm(form.props); return tree; };
      render();
    } else {
      nodes(tree).find(n => n.type === 'button' && text(n).includes('Entrar')).props.onClick(); render();
    }
    const rut = nodes(tree).find(n => n.type === 'input' && typeof n.props.onChange === 'function');
    rut.props.onChange({ target: { value: '12345678-9' } }); render();
    const lookup = nodes(tree).find(n => n.type === 'button' && text(n).includes('Continuar'));
    await lookup.props.onClick(); render();
    if (template === 'gala') {
      nodes(tree).find(n => n.type === 'button' && text(n).includes('Continuar')).props.onClick(); render();
    }
    const expectSection = option === true || cap > 0;
    expect(text(tree).includes('Carga Precargada')).toBe(expectSection);
    const add = nodes(tree).find(n => n.type === 'button' && /Agregar (carga|invitado)/i.test(text(n)));
    expect(!!add).toBe(option !== true && cap > 0);
    if (!expectSection) return;
    const checkbox = nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox');
    expect(checkbox).toBeDefined(); checkbox.props.onChange(); render();
    expect(nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox').props.checked).toBe(true);
    if (add) {
      add.props.onClick(); render();
      const name = nodes(tree).find(n => n.type === 'input' && /Nombre del/i.test(n.props.placeholder || ''));
      expect(name).toBeDefined(); name.props.onChange({ target: { value: 'Invitado adicional' } }); render();
    }
    await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    const request = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).endsWith('/register'));
    expect(request).toBeDefined();
    const payload = JSON.parse(request![1].body);
    expect(payload.guestsBySchedule[SID]).toEqual(option === true ? [{ id: GID }] : [
      { id: GID }, expect.objectContaining({ firstName: 'Invitado adicional' }),
    ]);
  });
  it.each(Object.keys(templates).flatMap(template => [undefined, false, true].map(option => ({ template, option }))))(
    '$template: registro abierto con opción=$option', async ({ template, option }) => {
      const event: any = { id: 'ev1', name: 'Abierto', publicTemplate: template, allowGuests: true, maxGuestsPerParticipant: 2,
        schedules: [{ id: SID, scheduleName: 'Fecha', startDateTime: '2027-12-01T12:00:00Z', endDateTime: '2027-12-01T20:00:00Z' }],
        registrationConfig: { mode: 'open', formFields: { email: { enabled: false }, phone: { enabled: false } }, guests: { mode: 'named', preloadedOnly: option } } };
      const Template = templates[template as keyof typeof templates];
      render = () => { cursor = 0; tree = Template({ event, slug: 'prueba' }); return tree; }; render();
      if (template !== 'gala') {
        const form = nodes(tree).find(n => n.type === PublicRegistrationForm); state = [];
        render = () => { cursor = 0; tree = PublicRegistrationForm(form.props); return tree; }; render();
        values.firstName = 'Titular'; values.lastName = 'Prueba'; values.documentNumber = '11111111-1';
      } else {
        nodes(tree).find(n => n.type === 'button' && text(n).includes('Entrar')).props.onClick(); render();
        nodes(tree).find(n => n.type === 'button' && text(n).includes('Continuar')).props.onClick(); render();
        for (const [placeholder, value] of [['Nombre *', 'Titular'], ['Apellido *', 'Prueba']]) {
          nodes(tree).find(n => n.type === 'input' && n.props.placeholder === placeholder).props.onChange({ target: { value } }); render();
        }
        nodes(tree).find(n => n.type === 'input' && (n.props.placeholder || '').startsWith('RUT')).props.onChange({ target: { value: '11111111-1' } }); render();
      }
      const add = nodes(tree).find(n => n.type === 'button' && /Agregar (invitado|carga)/i.test(text(n)));
      expect(!!add).toBe(option !== true);
      if (add) {
        add.props.onClick(); render();
        nodes(tree).find(n => n.type === 'input' && /Nombre del/i.test(n.props.placeholder || '')).props.onChange({ target: { value: 'Nuevo' } }); render();
      }
      await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
      const request = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).endsWith('/register'));
      expect(request).toBeDefined();
      const guests = JSON.parse(request![1].body).guestsBySchedule[SID];
      expect(guests).toEqual(option === true ? [] : [expect.objectContaining({ firstName: 'Nuevo' })]);
    });

  it('Gala: conserva la fecha ya inscrita y confirma cargas solo para una fecha nueva', async () => {
    const old = '22222222-2222-4222-a222-222222222222';
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ found: true,
      participant: { id: 'p1', firstName: 'Titular', lastName: 'Prueba', documentNumber: '11111111-1' },
      guests: [{ id: GID, firstName: 'Carga', lastName: 'Precargada' }], allowMultiple: true,
      registeredScheduleIds: [old], registeredGuestsBySchedule: { [old]: ['Invitado anterior'] } }) });
    const event: any = { id: 'ev1', name: 'Gala', allowGuests: true, maxGuestsPerParticipant: 0, allowMultipleSchedules: true,
      schedules: [ { id: old, scheduleName: 'Anterior', startDateTime: '2027-12-01T12:00:00Z', endDateTime: '2027-12-01T20:00:00Z' },
        { id: SID, scheduleName: 'Nueva', startDateTime: '2027-12-02T12:00:00Z', endDateTime: '2027-12-02T20:00:00Z' } ],
      registrationConfig: { mode: 'rut', formFields: { email: { enabled: false }, phone: { enabled: false } }, guests: { mode: 'named', preloadedOnly: true } } };
    render = () => { cursor = 0; tree = templates.gala({ event, slug: 'prueba' }); return tree; }; render();
    nodes(tree).find(n => n.type === 'button' && text(n).includes('Entrar')).props.onClick(); render();
    nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: '11111111-1' } }); render();
    await nodes(tree).find(n => n.type === 'button' && text(n).includes('Continuar')).props.onClick(); render();
    expect(nodes(tree).find(n => n.type === 'button' && text(n).includes('Anterior')).props.disabled).toBe(true);
    nodes(tree).find(n => n.type === 'button' && text(n).includes('Nueva')).props.onClick(); render();
    nodes(tree).find(n => n.type === 'button' && text(n).includes('Continuar')).props.onClick(); render();
    expect(text(tree)).toContain('Invitado anterior');
    expect(nodes(tree).some(n => n.type === 'button' && /Agregar invitado/i.test(text(n)))).toBe(false);
    nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange(); render();
    await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    const request = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).endsWith('/register'));
    expect(request).toBeDefined(); const body = JSON.parse(request![1].body);
    expect(body.scheduleIds).toEqual([SID]); expect(body.guestsBySchedule).toEqual({ [SID]: [{ id: GID }] });
  });

});
