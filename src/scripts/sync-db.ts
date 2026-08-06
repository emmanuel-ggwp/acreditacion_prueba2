import 'dotenv/config';
import { sequelize } from '../lib/sequelize';
import '../models';

// P08-D4 / D8.5 (SB-26, SB-32): `npm run db:sync` ejecutaba `sync({ force: true })`
// — DROP y CREATE de las 16 tablas, pérdida total sin confirmación. Y la variante
// segura (`alter`) vivía en un fichero huérfano sin script npm: la peligrosa tenía
// atajo y la segura no. Desde el 2026-08-06:
//
//   - `npm run db:sync`             → sync({ alter: true })  — NO destructivo.
//   - `FORCE_SYNC=yes npm run db:sync` → sync({ force: true }) — BORRA TODO.
//     La confirmación es la variable, escrita exactamente `yes`; cualquier otro
//     valor ABORTA en vez de degradar en silencio a `alter` (quien escribió
//     FORCE_SYNC=1 quería destruir; hacer otra cosa sin avisar es peor).
//
// Este script es una conveniencia de DESARROLLO. El camino de producción es
// `npm run db:migrate` (migraciones, SB-26): el aprovisionamiento no debe
// depender de sync() — `alter` también puede reescribir columnas con datos.

const wantsForce = process.env.FORCE_SYNC !== undefined || process.argv.includes('--force');
const forceConfirmed = process.env.FORCE_SYNC === 'yes';

const syncDatabase = async () => {
  try {
    if (wantsForce && !forceConfirmed) {
      console.error(
        'db:sync: modo destructivo pedido SIN confirmación válida.\n' +
        '  La única confirmación aceptada es la variable de entorno FORCE_SYNC=yes\n' +
        '  (exactamente "yes"). sync({ force: true }) hace DROP de TODAS las tablas\n' +
        '  y borra TODOS los datos. Nada se ha tocado.'
      );
      process.exit(1);
    }

    console.log('sync-db: NODE_ENV =', process.env.NODE_ENV);
    // R2: nunca imprimir el valor de un secreto — solo si está presente.
    console.log('sync-db: DATABASE_URL', process.env.DATABASE_URL ? 'presente' : 'AUSENTE');

    console.log('Starting database connection check...');
    await sequelize.authenticate();
    console.log('Connection OK — starting synchronization...');

    if (forceConfirmed) {
      console.warn(
        'db:sync: FORCE_SYNC=yes — DROP + CREATE de todas las tablas. ' +
        'PÉRDIDA TOTAL de los datos de esta base.'
      );
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ alter: true });
    }
    console.log('Database synchronized successfully' + (forceConfirmed ? ' (force).' : ' (alter, sin borrar datos).'));

    // `rate_limits` no es un modelo de Sequelize (la usa RateLimiterPostgres en
    // src/lib/auth-rate-limit.ts), así que sync() no la crea. Se crea aquí para
    // que el APROVISIONAMIENTO sea quien la garantice y la aplicación nunca
    // necesite el permiso CREATE en el esquema — en la base administrada de
    // DigitalOcean (PostgreSQL 15+) el usuario de aplicación no lo tiene por
    // defecto y el CREATE en caliente degradaba el limitador a memoria
    // (R2-03b; plan 08, D8.4). Mismo DDL que emite la librería.
    await sequelize.query(`CREATE TABLE IF NOT EXISTS rate_limits (
      key varchar(255) PRIMARY KEY,
      points integer NOT NULL DEFAULT 0,
      expire bigint
    );`);
    console.log('rate_limits table ensured.');

    // Show tables as seen by this connection
    try {
      const [rows] = await sequelize.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
      );
      console.log('Tables result:', JSON.stringify(rows, null, 2));
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('Tables in the database:');
      } else {
        console.log('No tables found in the database.');
      }
    } catch (qerr) {
      console.error('Error running SHOW TABLES:', qerr);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error synchronizing the database:', error);
    process.exit(1);
  } finally {
    await sequelize.close().catch((e) => {
      console.warn('Error closing DB connection:', e);
    });
  }
};

if (require.main === module) {
  syncDatabase();
}

export default syncDatabase;
