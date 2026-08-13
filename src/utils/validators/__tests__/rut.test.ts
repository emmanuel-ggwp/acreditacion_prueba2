import { cleanRut, computeRutDv, formatRut, isValidRut, normalizeRut, rutVariants } from '../rut';

describe('cleanRut', () => {
  it('quita puntos, guion y espacios, y sube la k a mayúscula', () => {
    expect(cleanRut('28.088.678-5')).toBe('280886785');
    expect(cleanRut(' 28088678-5 ')).toBe('280886785');
    expect(cleanRut('1234567-k')).toBe('1234567K');
    expect(cleanRut('')).toBe('');
  });
});

describe('normalizeRut (formato canónico de BD: sin puntos, con guion)', () => {
  // Los tres formatos de entrada aceptados deben converger al mismo valor guardado.
  it.each([
    ['28088678-5', '28088678-5'],
    ['28.088.678-5', '28088678-5'],
    ['280886785', '28088678-5'],
    [' 28.088.678-5 ', '28088678-5'],
  ])('normaliza %s -> %s', (input, expected) => {
    expect(normalizeRut(input)).toBe(expected);
  });

  it('sube la k del dígito verificador a mayúscula', () => {
    expect(normalizeRut('1234567k')).toBe('1234567-K');
    expect(normalizeRut('1.234.567-k')).toBe('1234567-K');
  });

  it('tolera RUT cortos (personas muy mayores) sin exigir largo mínimo', () => {
    expect(normalizeRut('123456-0')).toBe('123456-0');
  });

  it('devuelve la entrada limpia si no alcanza para cuerpo + DV', () => {
    expect(normalizeRut('5')).toBe('5');
    expect(normalizeRut('')).toBe('');
  });

  it('es idempotente: normalizar lo ya normalizado no lo cambia', () => {
    expect(normalizeRut(normalizeRut('28.088.678-5'))).toBe('28088678-5');
  });
});

describe('formatRut (solo presentación: con puntos y guion)', () => {
  it('agrega puntos de miles y guion', () => {
    expect(formatRut('280886785')).toBe('28.088.678-5');
    expect(formatRut('28088678-5')).toBe('28.088.678-5');
  });
});

describe('isValidRut', () => {
  it('acepta un RUT válido en cualquiera de los tres formatos', () => {
    expect(isValidRut('28088678-5')).toBe(true);
    expect(isValidRut('28.088.678-5')).toBe(true);
    expect(isValidRut('280886785')).toBe(true);
  });

  it('rechaza dígito verificador incorrecto', () => {
    expect(isValidRut('28088678-4')).toBe(false);
    expect(isValidRut('28.088.678-K')).toBe(false);
  });

  it('rechaza entradas no numéricas o demasiado cortas', () => {
    expect(isValidRut('')).toBe(false);
    expect(isValidRut('abc')).toBe(false);
    expect(isValidRut('5')).toBe(false);
  });
});

describe('computeRutDv', () => {
  it('calcula el DV del ejemplo canónico', () => {
    expect(computeRutDv('28088678')).toBe('5');
  });
});

describe('rutVariants', () => {
  it('incluye la variante canónica sin puntos con guion', () => {
    expect(rutVariants('28.088.678-5')).toContain('28088678-5');
  });
});
