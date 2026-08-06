/**
 * Normalización canónica de emails (R2-03c).
 *
 * Antes cada capa hacía la suya: el limitador de credenciales usaba
 * `trim().toLowerCase()`, `authService.login` buscaba con igualdad EXACTA
 * sobre una columna sensible a mayúsculas y ninguna ruta de alta normalizaba.
 * Consecuencias: dos usuarios que difirieran solo en mayúsculas compartían
 * cubo del limitador, y un usuario dado de alta como `Juan@X.com` existía con
 * esa grafía exacta como única llave de entrada.
 *
 * La decisión (plan 02, fase 3c) es normalizar EN ESCRITURA: el modelo `User`
 * pasa todo email por aquí antes de validar/guardar, y la búsqueda del login
 * normaliza su entrada para encontrarlo. Minúsculas y sin espacios exteriores
 * es la forma canónica; el dominio es insensible a mayúsculas por RFC y la
 * parte local sensible-a-mayúsculas es una rareza que ningún proveedor real
 * honra — el estándar de facto que ya asumía el limitador.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
