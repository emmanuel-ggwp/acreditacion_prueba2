/**
 * Next llama a `register()` una vez por instancia de servidor y espera a que
 * termine antes de atender la primera petición — que es justo lo que hace falta
 * para que un fallo de configuración sea visible en el arranque y no en la
 * primera consulta (F6-05 / F2-07).
 *
 * No se ejecuta durante `next build`, así que la validación no exige tener el
 * entorno de producción presente para compilar.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
}
