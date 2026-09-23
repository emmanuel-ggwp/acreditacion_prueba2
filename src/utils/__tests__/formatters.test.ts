import { formatDateCL, formatTimeCL, formatDateTimeCL } from '@/utils/formatters';

describe('formateadores públicos CL (es-CL + America/Santiago)', () => {
  // 02:00 UTC del 15-ene equivale a las 23:00 del 14-ene en Santiago (UTC-3 en verano
  // austral). Que el DÍA y la HORA resultantes sean los de Chile —y no los de UTC—
  // demuestra que la zona horaria se aplica de forma determinista, independiente del
  // reloj/locale de la máquina (evita el desajuste SSR/cliente que causa la hidratación).
  const iso = '2026-01-15T02:00:00.000Z';

  it('formatDateCL usa la fecha en hora de Chile', () => {
    expect(formatDateCL(iso, { day: '2-digit' })).toBe('14');
    expect(formatDateCL(iso, { year: 'numeric', month: '2-digit', day: '2-digit' })).toContain('2026');
  });

  it('formatTimeCL usa la hora de Chile (23:00 = 11:00 p. m.)', () => {
    // es-CL formatea en 12h: las 23:00 de Chile salen como "11:00 p. m." (no las 02:00 UTC).
    expect(formatTimeCL(iso)).toContain('11:00');
  });

  it('formatDateTimeCL combina fecha y hora de Chile', () => {
    const s = formatDateTimeCL(iso);
    expect(s).toContain('14');
    expect(s).toContain('11:00');
  });

  it('acepta un objeto Date, no solo string', () => {
    expect(formatTimeCL(new Date(iso))).toContain('11:00');
  });

  it('devuelve "" ante una fecha inválida (no rompe el render)', () => {
    expect(formatDateCL('no-es-fecha')).toBe('');
    expect(formatTimeCL('')).toBe('');
    expect(formatDateTimeCL(undefined as any)).toBe('');
  });
});
