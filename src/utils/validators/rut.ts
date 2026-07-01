import { z } from 'zod';

/**
 * Validación de RUT chileno (módulo 11).
 *
 * Tolerante con RUT de personas muy mayores: no exige una cantidad mínima de
 * dígitos (acepta RUT cortos/bajos de 6-7-8 dígitos), pero es estricto con el
 * dígito verificador ('0'-'9' o 'K').
 */

/** Quita puntos, guion y espacios, y normaliza a mayúsculas (para la 'K'). */
export const cleanRut = (rut: string): string =>
  (rut || '').replace(/[.\-\s]/g, '').toUpperCase();

/** Calcula el dígito verificador del cuerpo numérico de un RUT. */
export const computeRutDv = (numberPart: string): string => {
  let sum = 0;
  let multiplier = 2;
  for (let i = numberPart.length - 1; i >= 0; i--) {
    sum += parseInt(numberPart[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
};

/** Valida un RUT chileno completo (cuerpo + dígito verificador). */
export const isValidRut = (rut: string): boolean => {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false; // al menos 1 dígito de cuerpo + DV
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false; // el cuerpo deben ser solo dígitos
  if (!/^[0-9K]$/.test(dv)) return false; // DV es dígito o 'K'
  return computeRutDv(body) === dv;
};

/** Formatea un RUT con puntos y guion: 12345678-5 -> 12.345.678-5 */
export const formatRut = (rut: string): string => {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
};

/**
 * Devuelve las variantes de formato más comunes de un RUT, para buscar en BD
 * sin depender de cómo se haya guardado (con/sin puntos, con/sin guion, k/K).
 */
export const rutVariants = (raw: string): string[] => {
  const clean = cleanRut(raw);
  if (clean.length < 2) return [raw];
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return Array.from(new Set([
    `${body}-${dv}`, `${body}-${dv.toLowerCase()}`,
    `${body}${dv}`, `${body}${dv.toLowerCase()}`,
    `${dotted}-${dv}`, `${dotted}-${dv.toLowerCase()}`,
  ]));
};

/** Schema Zod para un RUT chileno obligatorio. */
export const rutSchema = z
  .string()
  .refine((v) => isValidRut(v), { message: 'RUT inválido' });

/** Schema Zod para un RUT chileno opcional. */
export const optionalRutSchema = z
  .string()
  .refine((v) => !v || isValidRut(v), { message: 'RUT inválido' })
  .optional()
  .nullable();
