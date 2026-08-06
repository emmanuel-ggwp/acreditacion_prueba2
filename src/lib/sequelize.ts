import { Sequelize } from 'sequelize';
import fs from 'fs';

// Sin dotenv aquí (F6-06): Next carga .env* por sí mismo y en producción el entorno
// lo inyecta el gestor de procesos. Los scripts tsx cargan dotenv/config ellos mismos.

console.log('Initializing Sequelize instance...');

// DB_SSL es la ÚNICA fuente de decisión (F6-04): NODE_ENV no debe forzarlo.
//
// CAMBIO DEL 2026-08-06: la reconstrucción usa la base ADMINISTRADA de DigitalOcean,
// no PostgreSQL en el droplet. En producción DB_SSL va en "true", y entonces
// `rejectUnauthorized` exige la CA de DigitalOcean, que Node NO lleva en su almacén
// (Standard Edition: CA propia del cluster). La aporta DB_CA_CERT — ruta a la CA en
// PEM — leída aquí y pasada como `dialectOptions.ssl.ca` (P07-D7.9, cierra SB-09).
// Bajar rejectUnauthorized a false NO es la salida — deja cifrado sin autenticación,
// que es el defecto que F6-04 corrigió, y ahora sí hay red intermedia.
const useSSL = process.env.DB_SSL === 'true';

// En el arranque de la aplicación, env.ts ya garantizó que con DB_SSL=true la
// ruta existe y es un PEM legible (y aborta nombrando la variable si no). Esta
// lectura defensiva cubre a los scripts tsx (db:sync, seeds, migrate), que
// importan este módulo sin pasar por validateEnv: mejor un error que nombra
// DB_CA_CERT que un ENOENT anónimo a mitad de la construcción del pool.
// Sin DB_CA_CERT no se aborta aquí: con Advanced Edition la CA no existe y el
// certificado se valida contra el almacén del sistema — quién la exige (y
// cuándo) es decisión de env.ts, no de este módulo.
function readDbCaCert(): string | undefined {
  const ruta = process.env.DB_CA_CERT;
  if (!useSSL || !ruta) return undefined;
  try {
    return fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code ?? 'desconocido';
    // R2: se nombra la variable; la ruta no es un secreto pero tampoco hace falta.
    throw new Error(
      `DB_CA_CERT apunta a una ruta que no se puede leer (código ${code}); ` +
        'con DB_SSL=true la CA de la base administrada es imprescindible (SB-09).'
    );
  }
}

const dbCaCert = readDbCaCert();

export const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
  timezone: '+00:00', // UTC
  dialectOptions: useSSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: true,
          // Con la CA presente, Node valida el certificado del servidor contra
          // ELLA (Standard Edition). Sin ella, contra el almacén del sistema
          // (suficiente solo en Advanced Edition — ver env.ts).
          ...(dbCaCert ? { ca: dbCaCert } : {}),
        },
      }
    : {},
});
