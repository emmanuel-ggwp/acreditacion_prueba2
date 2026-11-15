jest.mock('@/store/accreditationStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/store/authStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../TicketDeliveryControl', () => ({ __esModule: true, default: () => null }), { virtual: true });
jest.mock('../AttendanceHistoryAlert', () => ({ __esModule: true, default: () => null }), { virtual: true });
jest.mock('@/components/ui/Toast', () => ({ showToast: { success: jest.fn(), error: jest.fn() } }));
import React from 'react';
import Card from '../ParticipantCard';
import useAccreditationStore from '@/store/accreditationStore';
import useAuthStore from '@/store/authStore';
import { CENTINELA_EVENT_ID, CENTINELA_COMPANION_KEY } from '@/utils/centinelaCompanion';
const nodes = (tree: any): any[] => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
const text = (tree: any): string => Array.isArray(tree) ? tree.map(text).join('') : tree == null || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
describe('Acreditación de Centinela: cargas y adulto juntos', () => {
  let state: any[], cursor: number, store: any, person: any;
  const render = () => { cursor = 0; return Card({ person, type: 'participant', scheduleId: 'date' } as any); };
  beforeEach(() => {
    state = []; cursor = 0;
    jest.spyOn(React, 'useState').mockImplementation(((initial: any) => {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (value: any) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    }) as any);
    jest.spyOn(React, 'useEffect').mockImplementation(() => {});
    jest.spyOn(React, 'useCallback').mockImplementation(fn => fn);
    jest.spyOn(React, 'useRef').mockImplementation((value: any) => ({ current: value }));
    store = { verifyAccreditation: jest.fn().mockResolvedValue({ isAccredited: false }), accreditParticipant: jest.fn().mockResolvedValue({}), accreditGuest: jest.fn().mockResolvedValue({}), setGuestCount: jest.fn().mockResolvedValue({}), unaccredit: jest.fn(), loading: false };
    (useAccreditationStore as unknown as jest.Mock).mockReturnValue(store);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'operator' } });
    person = { id: 'person', eventId: CENTINELA_EVENT_ID, firstName: 'Titular', lastName: 'Prueba', guestCount: 1, guestLoads: 0, guestCompanion: true,
      customData: { [CENTINELA_COMPANION_KEY]: { enabled: true, label: '¿Asiste con acompañante adulto?' } },
      guests: [{ id: 'child', firstName: 'Carga', lastName: 'Prueba' }], schedules: [{ id: 'date' }],
    };
  });
  afterEach(() => jest.restoreAllMocks());
  test('muestra simultáneamente la carga con nombre y el bloque del adulto', () => {
    const tree = render();
    expect(text(tree)).toContain('Carga Prueba');
    expect(text(tree)).toContain('Acompañante adulto');
    expect(text(tree)).toContain('¿Llegó el acompañante adulto? (0 o 1)');
    expect(nodes(tree).find(n => n.type === 'input' && n.props.type === 'number').props.max).toBe(1);
  });
  test('si respondió No, mantiene la carga sin inventar un adulto', () => {
    person.customData[CENTINELA_COMPANION_KEY].enabled = false;
    person.guestCompanion = false; person.guestCount = 0;
    const tree = render();
    expect(text(tree)).toContain('Carga Prueba');
    expect(text(tree)).not.toContain('¿Llegó el acompañante adulto?');
  });
  test('no habilita invitados mixtos de otro evento', () => {
    person.eventId = 'otro-evento';
    expect(text(render())).not.toContain('¿Llegó el acompañante adulto?');
  });
  test('no transforma la respuesta Sí en una acreditación al abrir la ficha', () => {
    render();
    expect(store.accreditParticipant).not.toHaveBeenCalled();
    expect(store.accreditGuest).not.toHaveBeenCalled();
  });
  test('acredita al titular con el adulto indicado y mantiene la selección de cargas', async () => {
    render(); state[0] = ['child']; state[2] = 1;
    const button = nodes(render()).find(n => n.type === 'button' && text(n).includes('ACREDITAR'));
    await button.props.onClick();
    expect(store.accreditParticipant).toHaveBeenCalledWith('person', 'date', 'operator', undefined, 1);
    expect(store.accreditGuest).toHaveBeenCalledWith('child', 'date', 'operator');
  });
  test('permite acreditar solo las cargas y registrar que el adulto no llegó', async () => {
    render(); state[0] = ['child']; state[2] = 0;
    await nodes(render()).find(n => n.type === 'button' && text(n).includes('ACREDITAR')).props.onClick();
    expect(store.accreditParticipant).toHaveBeenCalledWith('person', 'date', 'operator', undefined, 0);
    expect(store.accreditGuest).toHaveBeenCalledWith('child', 'date', 'operator');
  });
  test('la entrada del adulto se limita a cero o uno', () => {
    const input = nodes(render()).find(n => n.type === 'input' && n.props.type === 'number');
    input.props.onChange({ target: { value: '8' } });
    expect(state[2]).toBe(1);
    input.props.onChange({ target: { value: '-3' } });
    expect(state[2]).toBe(0);
  });
});
