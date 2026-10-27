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
    const workbook = (XLSX.write as jest.Mock).mock.calls[0][0];
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

  it('conserva las hojas vacías cuando no hay participantes', async () => {
    const result = await exportRows([]);
    expect(result.participants).toEqual([{ 'Sin participantes': '' }]);
    expect(result.guests).toEqual([{ 'Sin invitados': '' }]);
  });
});
