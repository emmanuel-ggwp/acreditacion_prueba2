import { sequelize } from '../src/lib/sequelize';
import {
  User,
  Event,
  EventSchedule,
  Participant,
  Guest,
  Award,
  ParticipantAward,
  Accreditation,
  RefreshToken,
  AuditLog
} from '../src/models/index';

const syncDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Force usage of models to ensure they are loaded
    console.log('Loaded models:', [User.name, Event.name, EventSchedule.name, Participant.name, Guest.name, Award.name, ParticipantAward.name, Accreditation.name, RefreshToken.name, AuditLog.name]);

    console.log('Models to sync:', Object.keys(sequelize.models));

    // Sync all models
    // Use { force: true } to drop and re-create tables (WARNING: DATA LOSS)
    // Use { alter: true } to update tables without data loss (safer for dev)
    await sequelize.sync({ alter: true }); 
    console.log('All models were synchronized successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database or synchronize models:', error);
    process.exit(1);
  }
};

syncDB();
