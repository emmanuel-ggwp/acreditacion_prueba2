jest.mock('../apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('xlsx', () => ({
  ...jest.requireActual('xlsx'),
  write: jest.fn(() => new ArrayBuffer(0)),
}));

import * as XLSX from 'xlsx';
import apiClient from '../apiClient';
import { exportParticipantsToExcel } from '../exportParticipants';
import { formatDateTimeCL } from '../formatters';

describe('exportParticipantsToExcel: acreditación individual de invitados', () => {
  const descriptors: Record<string, PropertyDescriptor | undefined> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of ['window', 'document']) descriptors[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
      URL: { createObjectURL: jest.fn(() => 'blob:excel'), revokeObjectURL: jest.fn() },
    } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
      createElement: jest.fn(() => ({ click: jest.fn() })),
      body: { appendChild: jest.fn(), removeChild: jest.fn() },
    } });
  });

  afterEach(() => {
    for (const key of ['window', 'document']) {
      const descriptor = descriptors[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as any)[key];
    }
  });

  const exportRows = async (participants: any[]) => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(participants).mockResolvedValueOnce({ registrationConfig: {} });
    await exportParticipantsToExcel('e1', 'Evento');
    const calls = (XLSX.write as jest.Mock).mock.calls;
    const workbook = calls[calls.length - 1][0];
    return {
      participants: XLSX.utils.sheet_to_json<any>(workbook.Sheets.Participantes, { defval: '' }),
      guests: XLSX.utils.sheet_to_json<any>(workbook.Sheets.Invitados, { defval: '' }),
    };
  };

  it('muestra el check-in propio del acompañante y deja sin fecha al invitado no acreditado', async () => {
    const checkedIn = '2026-10-26T23:15:00Z';
    const result = await exportRows([{
      firstName: 'Titular', lastName: 'Uno', isAccredited: true, accreditedAt: '2026-10-26T22:00:00Z',
      schedules: [{ scheduleName: 'Gala', startDateTime: '2026-10-26T20:00:00Z' }],
      guests: [
        { firstName: 'Acompañante', guestType: 'ACOMPANANTE', isAccredited: true, accreditedAt: checkedIn },
        { firstName: 'Carga', guestType: 'CARGA', isAccredited: false, accreditedAt: null },
      ],
    }]);
    const row = result.participants[0];
    expect(row['Acreditado invitado 1']).toBe('Sí');
    expect(row['Fecha y hora de acreditación invitado 1']).toBe(formatDateTimeCL(checkedIn));
    expect(row['Fecha y hora de acreditación invitado 1']).not.toBe(row['Hora de acreditación']);
    expect(row['Acreditado invitado 2']).toBe('No');
    expect(row['Fecha y hora de acreditación invitado 2']).toBe('');
    expect(row['Fecha invitado 1']).toContain('Gala');
    expect(row['Cant. invitados']).toBe(2);
    expect(result.guests[0]['Tipo']).toBe('Acompañante');
    expect(result.guests[0]['Hora de acreditación']).toBe(row['Fecha y hora de acreditación invitado 1']);
    expect(result.guests[1]['Acreditado']).toBe('No');
  });

  it('no inventa acreditaciones ni fechas para bloques vacíos o acompañantes numéricos', async () => {
    const result = await exportRows([
      { firstName: 'Con invitado', guests: [{ firstName: 'Sin ingreso', isAccredited: false }] },
      { firstName: 'Solo cantidad', guestCompanion: true, guestCount: 1, isAccredited: true, accreditedAt: '2026-10-26T23:15:00Z', guests: [] },
    ]);
    expect(result.participants[0]['Acreditado invitado 1']).toBe('No');
    expect(result.participants[0]['Fecha y hora de acreditación invitado 1']).toBe('');
    expect(result.participants[1]['Acompañante']).toBe('Sí');
    expect(result.participants[1]['Acreditado invitado 1']).toBe('');
    expect(result.participants[1]['Fecha y hora de acreditación invitado 1']).toBe('');
  });

  it('muestra el número real de invitados acreditados y conserva las cargas declaradas', async () => {
    const result = await exportRows([
      { firstName: 'Gustavo', guestCount: 4, guestLoads: 4, accreditedGuestCount: 5, guests: [] },
      { firstName: 'Marcela', guestCount: 2, guestLoads: 2, accreditedGuestCount: 3, guests: [] },
      { firstName: 'Sin acreditar', guestCount: 7, guestLoads: 7, accreditedGuestCount: 0, guests: [] },
    ]);
    expect(result.participants[0]['Invitados acreditados (suma de fechas)']).toBe(5);
    expect(result.participants[0]['Cant. invitados']).toBe(4);
    expect(result.participants[0]['Cargas']).toBe(4);
    expect(result.participants[1]['Invitados acreditados (suma de fechas)']).toBe(3);
    expect(result.participants[2]['Invitados acreditados (suma de fechas)']).toBe(0);
  });

  it('muestra los nombres que realmente asistieron al reemplazar y agregar invitados', async () => {
    const time = '2026-11-07T15:00:00Z';
    const participant = { firstName: 'Titular', accreditedGuestCount: 2, guests: [
      { firstName: 'Invitada original', lastName: 'Inscrita', isAccredited: false, accreditedAt: null },
      { firstName: 'Reemplazo', lastName: 'Presente', isAccredited: true, accreditedAt: time },
      { firstName: 'Adicional', lastName: 'Presente', isAccredited: true, accreditedAt: time },
    ] };
    const result = await exportRows([participant]);
    const row = result.participants[0];
    expect(row['Invitados acreditados (suma de fechas)']).toBe(2);
    expect(row['Invitado 1']).toBe('Invitada original Inscrita');
    expect(row['Acreditado invitado 1']).toBe('No');
    expect(row['Fecha y hora de acreditación invitado 1']).toBe('');
    expect(row['Invitado 2']).toBe('Reemplazo Presente');
    expect(row['Acreditado invitado 2']).toBe('Sí');
    expect(row['Invitado 3']).toBe('Adicional Presente');
    expect(row['Acreditado invitado 3']).toBe('Sí');
    expect(result.guests.map((g) => [g.Invitado, g.Acreditado])).toEqual([
      ['Invitada original', 'No'], ['Reemplazo', 'Sí'], ['Adicional', 'Sí'],
    ]);

    participant.guests[2].isAccredited = false;
    participant.guests[2].accreditedAt = null;
    participant.accreditedGuestCount = 1;
    const corrected = await exportRows([participant]);
    expect(corrected.participants[0]['Invitados acreditados (suma de fechas)']).toBe(1);
    expect(corrected.participants[0]['Acreditado invitado 3']).toBe('No');
    expect(corrected.guests[2]['Hora de acreditación']).toBe('');
  });

  it('agrega el comprobante de tickets sin alterar los campos de acreditación', async () => {
    const deliveredAt = '2026-11-07T15:00:00Z';
    const result = await exportRows([{ firstName: 'Ana', isAccredited: true, guests: [], ticketDelivery: { quantity: 4, deliveredAt, deliveredBy: 'u1' } }]);
    expect(result.participants[0]['Tickets entregados']).toBe(4);
    expect(result.participants[0]['Fecha y hora entrega tickets']).toBe(formatDateTimeCL(deliveredAt));
    expect(result.participants[0]['ID usuario entrega tickets']).toBe('u1');
    expect(result.participants[0]['Acreditado']).toBe('Sí');
  });

  it('conserva las hojas vacías cuando no hay participantes', async () => {
    const result = await exportRows([]);
    expect(result.participants).toEqual([{ 'Sin participantes': '' }]);
    expect(result.guests).toEqual([{ 'Sin invitados': '' }]);
  });
});
