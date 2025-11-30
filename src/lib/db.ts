import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
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

export const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync all models
    await sequelize.sync({ alter: true }); // Use { force: true } to drop and re-create tables
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database or synchronize models:', error);
    // Exit process with failure in a real application scenario
    // process.exit(1);
  }
};

export { sequelize };
