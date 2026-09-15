import 'dotenv/config';
import path from 'path';
import { Umzug, SequelizeStorage } from 'umzug';
import { validateDbEnv } from '../src/lib/env';

// Migraciones (SB-26; plan 08, D4): el camino de esquema de PRODUCCIÓN.
// `db:sync` (sync alter) queda como conveniencia de desarrollo; esto es lo que
// corre el aprovisionamiento y cada despliegue con cambio de esquema.
//
//   npm run db:migrate          → aplica las pendientes, en orden, y registra
//                                 cada una en la tabla SequelizeMeta.
//   npm run db:migrate:status   → ejecutadas y pendientes, sin tocar nada.
//   npx tsx scripts/migrate.ts down   → revierte SOLO la última (la línea base
//                                       se niega a revertirse: ver su down()).
//
// Cada migración es un fichero en migrations/ con `up` y `down` exportados,
// nombrado NNNN-descripcion.ts: el orden lexicográfico es el orden de aplicación.
// R2: las migraciones no imprimen valores de secretos ni de datos.
//
// ENTORNO. `dotenv/config` lee el `.env` del directorio actual (desarrollo) y
// NUNCA pisa una variable ya exportada. En el droplet no hay `.env`: el
// entorno del servicio está en /etc/tuacreditacion.env y hay que cargarlo a
// mano (`set -a; . /etc/tuacreditacion.env; set +a`) y exportar encima la
// DATABASE_URL de doadmin — procedimiento en infra/RUNBOOK.md §7. La
// validación de abajo es la MISMA que la de la app para las variables de la
// base: una URL con `?sslmode=require` (la de la consola) aborta aquí
// nombrando el problema, en vez de salir como «self-signed certificate in
// certificate chain» en el handshake TLS (2026-09-15).

const cmd = process.argv[2] ?? 'status';

const main = async () => {
  // Antes de importar sequelize.ts: ese módulo construye el pool al importarse.
  validateDbEnv();
  const { sequelize } = await import('../src/lib/sequelize');
  await import('../src/models');

  const umzug = new Umzug({
    migrations: {
      // glob exige separadores POSIX también en Windows
      glob: ['*.ts', { cwd: path.join(__dirname, '..', 'migrations').replace(/\\/g, '/') }],
    },
    context: sequelize,
    storage: new SequelizeStorage({ sequelize }), // tabla SequelizeMeta
    logger: console,
  });

  try {
    await sequelize.authenticate();
    switch (cmd) {
      case 'up': {
        const applied = await umzug.up();
        console.log(
          applied.length
            ? `Migraciones aplicadas (${applied.length}): ${applied.map((m) => m.name).join(', ')}`
            : 'Nada pendiente: el esquema ya está al día.'
        );
        break;
      }
      case 'down': {
        // Un paso, nunca todos: revertir en cadena es una decisión humana.
        const reverted = await umzug.down();
        console.log(`Revertida: ${reverted.map((m) => m.name).join(', ')}`);
        break;
      }
      case 'status': {
        const executed = await umzug.executed();
        const pending = await umzug.pending();
        console.log(`Ejecutadas (${executed.length}):`);
        executed.forEach((m) => console.log(`  ✓ ${m.name}`));
        console.log(`Pendientes (${pending.length}):`);
        pending.forEach((m) => console.log(`  · ${m.name}`));
        break;
      }
      default: {
        console.error(`Comando desconocido: "${cmd}". Usa: up | down | status`);
        process.exit(1);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('migrate: error —', error);
    process.exit(1);
  } finally {
    await sequelize.close().catch(() => undefined);
  }
};

main();
