
// Import models for their side effects so Model.init() registers them with Sequelize.
import User from './User';
import Event from './Event';
import EventSchedule from './EventSchedule';
import Participant from './Participant';
import ParticipantSchedule from './ParticipantSchedule';
import Guest from './Guest';
import GuestSchedule from './GuestSchedule';
import Award from './Award';
import ParticipantAward from './ParticipantAward';
import Accreditation from './Accreditation';
import RefreshToken from './RefreshToken';
import AuditLog from './AuditLog';
import EmailTemplate from './EmailTemplate';
import GiftCampaign from './GiftCampaign';
import GiftType from './GiftType';
import GiftEmployee from './GiftEmployee';
import GiftDelivery from './GiftDelivery';

// Define associations here to avoid circular dependencies
Participant.belongsToMany(EventSchedule, { through: ParticipantSchedule, foreignKey: 'participantId', as: 'schedules' });
EventSchedule.belongsToMany(Participant, { through: ParticipantSchedule, foreignKey: 'scheduleId', as: 'participants' });

// Invitados por fecha (M:N Guest ⇄ EventSchedule vía GuestSchedule). Permite invitados
// distintos en cada fecha. Alias 'schedules' en Guest → mixins get/set/addSchedules.
Guest.belongsToMany(EventSchedule, { through: GuestSchedule, foreignKey: 'guestId', as: 'schedules' });
EventSchedule.belongsToMany(Guest, { through: GuestSchedule, foreignKey: 'scheduleId', as: 'guests' });

// Regalos Navidad
GiftCampaign.hasMany(GiftType, { foreignKey: 'campaignId', as: 'types' });
GiftType.belongsTo(GiftCampaign, { foreignKey: 'campaignId' });
GiftCampaign.hasMany(GiftEmployee, { foreignKey: 'campaignId', as: 'employees' });
GiftEmployee.belongsTo(GiftCampaign, { foreignKey: 'campaignId' });
GiftEmployee.hasMany(GiftDelivery, { foreignKey: 'employeeId', as: 'deliveries' });
GiftDelivery.belongsTo(GiftEmployee, { foreignKey: 'employeeId', as: 'employee' });
GiftType.hasMany(GiftDelivery, { foreignKey: 'giftTypeId', as: 'deliveries' });
GiftDelivery.belongsTo(GiftType, { foreignKey: 'giftTypeId', as: 'giftType' });

export {
  User,
  Event,
  EventSchedule,
  Participant,
  ParticipantSchedule,
  Guest,
  GuestSchedule,
  Award,
  ParticipantAward,
  Accreditation,
  RefreshToken,
  AuditLog,
  EmailTemplate,
  GiftCampaign,
  GiftType,
  GiftEmployee,
  GiftDelivery
};