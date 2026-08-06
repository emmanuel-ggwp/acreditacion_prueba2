import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('Initializing Sequelize instance...');

// DB_SSL es la ÚNICA fuente de decisión (F6-04): la reconstrucción usa PostgreSQL
// autoalojado en el mismo droplet, que no habla SSL — NODE_ENV no debe forzarlo.
// Si la conexión sale de la máquina, DB_SSL=true valida el certificado del servidor;
// una CA propia (BD administrada) se configura en el sistema, no aquí.
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
