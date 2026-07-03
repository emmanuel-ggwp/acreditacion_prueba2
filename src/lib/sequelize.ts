import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('Initializing Sequelize instance...');

// DigitalOcean (y la mayoría de BD administradas) exigen SSL. Se activa en producción
// o con DB_SSL=true; en local (development) se conecta sin SSL.
const useSSL = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

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
  dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});
