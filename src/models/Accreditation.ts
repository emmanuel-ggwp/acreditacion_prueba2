
import { 
  Model, 
  DataTypes, 
  UUIDV4, 
  Op,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Participant from './Participant';
import Guest from './Guest';
import EventSchedule from './EventSchedule';
import User from './User';

class Accreditation extends Model {
  declare public id: string;
  declare public participantId: string;
  declare public guestId: string | null;
  declare public eventScheduleId: string;
  declare public accreditedBy: string;
  declare public accreditedAt: Date;
  declare public checkInTime: Date;
  declare public checkOutTime: Date | null;
  declare public notes: string | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Mixins for Participant
  declare public getParticipant: BelongsToGetAssociationMixin<Participant>;
  declare public setParticipant: BelongsToSetAssociationMixin<Participant, string>;
  declare public createParticipant: BelongsToCreateAssociationMixin<Participant>;

  // Mixins for Guest
  declare public getGuest: BelongsToGetAssociationMixin<Guest>;
  declare public setGuest: BelongsToSetAssociationMixin<Guest, string>;
  declare public createGuest: BelongsToCreateAssociationMixin<Guest>;

  // Mixins for EventSchedule
  declare public getEventSchedule: BelongsToGetAssociationMixin<EventSchedule>;
  declare public setEventSchedule: BelongsToSetAssociationMixin<EventSchedule, string>;
  declare public createEventSchedule: BelongsToCreateAssociationMixin<EventSchedule>;

  // Mixins for User (AccreditedBy)
  declare public getUser: BelongsToGetAssociationMixin<User>;
  declare public setUser: BelongsToSetAssociationMixin<User, string>;
  declare public createUser: BelongsToCreateAssociationMixin<User>;
}

Accreditation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Participant,
        key: 'id',
      },
    },
    guestId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Guest,
        key: 'id',
      },
    },
    eventScheduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: EventSchedule,
        key: 'id',
      },
    },
    accreditedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    accreditedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    checkInTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    checkOutTime: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP') as any,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP') as any,
    },
  },
  {
    sequelize,
    modelName: 'Accreditation',
    tableName: 'accreditations',
    timestamps: true,
    indexes: [
      {
        fields: ['event_schedule_id'],
      },
      {
        unique: true,
        fields: ['participant_id', 'event_schedule_id'],
        name: 'unique_accreditation_participant_schedule',
      },
      {
        unique: true,
        fields: ['guest_id', 'event_schedule_id'],
        name: 'unique_accreditation_guest_schedule',
        where: {
          guest_id: {
            [Op.ne]: null,
          },
        },
      },
    ],
  }
);

// Associations
Participant.hasMany(Accreditation, { foreignKey: 'participantId' });
Accreditation.belongsTo(Participant, { foreignKey: 'participantId' });

Guest.hasMany(Accreditation, { foreignKey: 'guestId' });
Accreditation.belongsTo(Guest, { foreignKey: 'guestId' });

EventSchedule.hasMany(Accreditation, { foreignKey: 'eventScheduleId' });
Accreditation.belongsTo(EventSchedule, { foreignKey: 'eventScheduleId' });

User.hasMany(Accreditation, { foreignKey: 'accreditedBy' });
Accreditation.belongsTo(User, { foreignKey: 'accreditedBy', as: 'accreditedByUser' });

export default Accreditation;
