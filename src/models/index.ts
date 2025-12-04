
// Import models for their side effects so Model.init() registers them with Sequelize.
import User from './User';
import Event from './Event';
import EventSchedule from './EventSchedule';
import Participant from './Participant';
import ParticipantSchedule from './ParticipantSchedule';
import Guest from './Guest';
import Award from './Award';
import ParticipantAward from './ParticipantAward';
import Accreditation from './Accreditation';
import RefreshToken from './RefreshToken';

// Define associations here to avoid circular dependencies
Participant.belongsToMany(EventSchedule, { through: ParticipantSchedule, foreignKey: 'participantId' });
EventSchedule.belongsToMany(Participant, { through: ParticipantSchedule, foreignKey: 'scheduleId' });

export {
  User,
  Event,
  EventSchedule,
  Participant,
  ParticipantSchedule,
  Guest,
  Award,
  ParticipantAward,
  Accreditation,
  RefreshToken
};