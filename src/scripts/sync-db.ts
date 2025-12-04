import { sequelize } from '../lib/sequelize';
import '../models';

const syncDatabase = async () => {
  try {
    console.log('sync-db: NODE_ENV =', process.env.NODE_ENV);
    console.log('sync-db: DATABASE_URL =', process.env.DATABASE_URL);

    console.log('Starting database connection check...');
    await sequelize.authenticate();
    console.log('Connection OK — starting synchronization...');

    await sequelize.sync({ force: true }); // or { force: true } if you want to recreate tables
    console.log('Database synchronized successfully.');

    // Show tables as seen by this connection
    try {
      const [rows] = await sequelize.query("SHOW TABLES");
      console.log('SHOW TABLES result:', JSON.stringify(rows, null, 2));
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