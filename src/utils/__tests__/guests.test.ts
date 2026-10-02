import { buildGuestSummary, buildAttendanceDetail } from '../guests';

describe('guests · correo de confirmación', () => {
  describe('buildGuestSummary', () => {
    it('modo named: "N (nombres)"', () => {
      expect(buildGuestSummary('named', { names: ['Ana Pérez', 'Luis Soto'] }))
        .toEqual({ count: 2, summary: '2 (Ana Pérez, Luis Soto)' });
    });

    it('modo named sin nombres → "Sin invitados"', () => {
      expect(buildGuestSummary('named', { names: ['', '  '] }))
        .toEqual({ count: 0, summary: 'Sin invitados' });
    });

    it('modo count: solo el número', () => {
      expect(buildGuestSummary('count', { count: 3 })).toEqual({ count: 3, summary: '3' });
      expect(buildGuestSummary('count', { count: 0 })).toEqual({ count: 0, summary: 'Sin invitados' });
      // Negativos se acotan a 0.
      expect(buildGuestSummary('count', { count: -5 })).toEqual({ count: 0, summary: 'Sin invitados' });
    });

    it('modo companion: acompañante + cargas', () => {
      expect(buildGuestSummary('companion', { companion: true, loads: 2 }))
        .toEqual({ count: 3, summary: '3 (1 acompañante + 2 cargas)' });
      expect(buildGuestSummary('companion', { companion: true, loads: 1 }))
        .toEqual({ count: 2, summary: '2 (1 acompañante + 1 carga)' });
      expect(buildGuestSummary('companion', { companion: false, loads: 0 }))
        .toEqual({ count: 0, summary: 'Sin invitados' });
    });
  });

  describe('buildAttendanceDetail', () => {
    it('sin fechas → cadena vacía', () => {
      expect(buildAttendanceDetail([])).toBe('');
      expect(buildAttendanceDetail([null as any])).toBe('');
    });

    it('una fecha: bloque simple Fecha/Lugar/Invitados (sin nombre de horario)', () => {
      const out = buildAttendanceDetail([
        { when: 'vie 25 de septiembre, 20:00', location: 'Salón A', guestNames: ['Ana', 'Luis'] },
      ]);
      expect(out).toBe('Fecha: vie 25 de septiembre, 20:00\nLugar: Salón A\nInvitados: Ana, Luis');
    });

    it('una fecha con etiqueta corta (Mañana/Tarde) la agrega tras la fecha', () => {
      const out = buildAttendanceDetail([
        { label: 'Mañana', when: 'vie 25, 10:00', location: 'Salón A', guestNames: ['Ana'] },
      ]);
      expect(out).toContain('Fecha: vie 25, 10:00 · Mañana');
    });

    it('una fecha sin invitados → "Sin invitados"', () => {
      const out = buildAttendanceDetail([{ when: 'vie 25', location: 'Salón A', guestNames: [] }]);
      expect(out).toContain('Sin invitados');
      expect(out).not.toContain('Invitados: Sin');
    });

    it('una fecha con guestsText (modo numérico) usa el resumen', () => {
      const out = buildAttendanceDetail([
        { when: 'vie 25', location: 'Salón A', guestsText: '1 acompañante + 2 cargas' },
      ]);
      expect(out).toContain('Invitados: 1 acompañante + 2 cargas');
    });

    it('varias fechas: desglose FECHA primero, sin nombre de horario', () => {
      const out = buildAttendanceDetail([
        { when: 'viernes 25, 20:00', location: 'Salón A', guestNames: ['Ana'] },
        { when: 'sábado 26, 20:00', location: 'Salón B', guestNames: ['Luis', 'Sofía'] },
      ]);
      expect(out).toContain('Estás inscrito en 2 fechas:');
      expect(out).toContain('• viernes 25, 20:00 · Salón A');
      expect(out).toContain('Invitados: Ana');
      expect(out).toContain('• sábado 26, 20:00 · Salón B');
      expect(out).toContain('Invitados: Luis, Sofía');
      // No se muestra el nombre interno del horario (ej. "Función 1").
      expect(out).not.toContain('Función');
    });

    it('varias fechas con etiqueta: fecha · etiqueta · lugar', () => {
      const out = buildAttendanceDetail([
        { label: 'Mañana', when: 'vie 25, 10:00', location: 'Salón A', guestNames: ['Ana'] },
        { label: 'Tarde', when: 'vie 25, 16:00', location: 'Salón A', guestNames: ['Luis'] },
      ]);
      expect(out).toContain('• vie 25, 10:00 · Mañana · Salón A');
      expect(out).toContain('• vie 25, 16:00 · Tarde · Salón A');
    });

    it('varias fechas con guestsText (numérico): mismo resumen por fecha', () => {
      const out = buildAttendanceDetail([
        { when: 'vie 25', guestsText: '3' },
        { when: 'sáb 26', guestsText: '3' },
      ]);
      expect(out).toContain('Estás inscrito en 2 fechas:');
      expect((out.match(/Invitados: 3/g) || []).length).toBe(2);
    });
  });
});
