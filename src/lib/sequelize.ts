import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

console.log('Initializing Sequelize instance...');

export const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'mysql',
  protocol: 'mysql',
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
    charset: 'utf8',
    collate: 'utf8_general_ci',
  },
  timezone: '+00:00', // UTC
});
