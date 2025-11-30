import { sequelize } from '../lib/sequelize';
import '../models'; // Import all models to register them with Sequelize

const syncDatabase = async () => {
  try {
    console.log('Starting database synchronization...');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing the database:', error);
  } finally {
    await sequelize.close();
  }
};

syncDatabase();
