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

    // D8 (plan 08): con la base INALCANZABLE (host caído, contraseña mal, CA
    // ausente — SB-09), el proceso arrancaba «sano», systemd lo daba por activo
    // y el fallo salía como 500 en la primera petición. Un authenticate() aquí
    // convierte eso en un arranque fallido, que es donde se mira. Solo en
    // producción: en desarrollo `next dev` debe poder arrancar sin la base
    // (Turbopack inlinea NODE_ENV en el build, así que el artefacto de
    // producción lleva SIEMPRE esta comprobación).
    if (process.env.NODE_ENV === 'production') {
      const { sequelize } = await import('./lib/sequelize');
      try {
        await sequelize.authenticate();
      } catch (e) {
        // R2: se nombra la variable, jamás su valor (la URL lleva credenciales).
        console.error(
          '\nNo se pudo conectar a la base de datos que indica DATABASE_URL. ' +
            'La aplicación no arranca.\n',
          e
        );
        process.exit(1);
      }
    }
  }
}
