import { Sequelize } from 'sequelize';

// Sin dotenv aquí (F6-06): Next carga .env* por sí mismo y en producción el entorno
// lo inyecta el gestor de procesos. Los scripts tsx cargan dotenv/config ellos mismos.

console.log('Initializing Sequelize instance...');

// DB_SSL es la ÚNICA fuente de decisión (F6-04): NODE_ENV no debe forzarlo.
//
// CAMBIO DEL 2026-08-06: la reconstrucción usa la base ADMINISTRADA de DigitalOcean,
// no PostgreSQL en el droplet. En producción DB_SSL va en "true", y entonces
// `rejectUnauthorized` exige la CA de DigitalOcean, que Node NO lleva en su almacén:
// sin aportarla, la aplicación NO CONECTA (SB-09, activada).
// Bajar rejectUnauthorized a false NO es la salida — deja cifrado sin autenticación,
// que es el defecto que F6-04 corrigió, y ahora sí hay red intermedia.
// Cómo se pasa la CA lo decide la fase 2 del plan 07; hasta entonces esto está
// pendiente y el primer arranque contra DigitalOcean fallará.
const useSSL = process.env.DB_SSL === 'true';

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
  dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: true } } : {},
});
