jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AttendanceHistoryNotice, AttendanceHistoryEntry } from '../AttendanceHistoryAlert';

describe('aviso informativo de asistencia', () => {
  const first: AttendanceHistoryEntry = { id: 'a1', scheduleId: 's1', scheduleName: 'Navidad primer turno', startDateTime: '2026-11-07T12:00:00Z', checkInTime: '2026-11-07T15:00:00Z' };
  it('no muestra un aviso de asistencia sin ingresos anteriores', () => {
    expect(renderToStaticMarkup(<AttendanceHistoryNotice history={[]} />)).toBe('');
  });
  it('muestra fecha y hora de ingreso de una asistencia', () => {
    const html = renderToStaticMarkup(<AttendanceHistoryNotice history={[first]} />);
    expect(html).toContain('Ya asistió a otra fecha');
    expect(html).toContain('Navidad primer turno');
    expect(html).toContain('Ingreso registrado:');
    expect(html).toContain('12:00');
    expect(html).toContain('Puedes acreditar su asistencia en esta fecha');
  });
  it('enumera todas las fechas anteriores e informa que se puede acreditar', () => {
    const html = renderToStaticMarkup(<AttendanceHistoryNotice history={[first, { ...first, id: 'a2', scheduleId: 's2', scheduleName: 'Navidad segundo turno' }]} />);
    expect(html).toContain('Ya asistió a 2 fechas');
    expect(html).toContain('Navidad primer turno');
    expect(html).toContain('Navidad segundo turno');
    expect(html.match(/Ingreso registrado:/g)).toHaveLength(2);
    expect(html).toContain('Aviso informativo. Puedes acreditar');
  });
});
