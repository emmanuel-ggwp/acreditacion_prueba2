
import { 
  Model, 
  DataTypes, 
  UUIDV4,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  HasManyCreateAssociationMixin
} from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Event from './Event';
import type Participant from './Participant';
import type Accreditation from './Accreditation';

class EventSchedule extends Model {
  declare public id: string;
  declare public eventId: string;
  declare public scheduleName: string;
  declare public startDateTime: Date;
  declare public endDateTime: Date;
  declare public maxCapacity: number | null;
  declare public isActive: boolean;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Mixins for Event
  declare public getEvent: BelongsToGetAssociationMixin<Event>;
  declare public setEvent: BelongsToSetAssociationMixin<Event, string>;
  declare public createEvent: BelongsToCreateAssociationMixin<Event>;

  // Mixins for Participant
  declare public getParticipants: BelongsToManyGetAssociationsMixin<Participant>;
  declare public addParticipant: BelongsToManyAddAssociationMixin<Participant, string>;
  declare public addParticipants: BelongsToManyAddAssociationsMixin<Participant, string>;
  declare public setParticipants: BelongsToManySetAssociationsMixin<Participant, string>;
  declare public removeParticipant: BelongsToManyRemoveAssociationMixin<Participant, string>;
  declare public removeParticipants: BelongsToManyRemoveAssociationsMixin<Participant, string>;
  declare public hasParticipant: BelongsToManyHasAssociationMixin<Participant, string>;
  declare public hasParticipants: BelongsToManyHasAssociationsMixin<Participant, string>;
  declare public countParticipants: BelongsToManyCountAssociationsMixin;

  // Mixins for Accreditation
  declare public getAccreditations: HasManyGetAssociationsMixin<Accreditation>;
  declare public addAccreditation: HasManyAddAssociationMixin<Accreditation, string>;
  declare public addAccreditations: HasManyAddAssociationsMixin<Accreditation, string>;
  declare public setAccreditations: HasManySetAssociationsMixin<Accreditation, string>;
  declare public removeAccreditation: HasManyRemoveAssociationMixin<Accreditation, string>;
  declare public removeAccreditations: HasManyRemoveAssociationsMixin<Accreditation, string>;
  declare public hasAccreditation: HasManyHasAssociationMixin<Accreditation, string>;
  declare public hasAccreditations: HasManyHasAssociationsMixin<Accreditation, string>;
  declare public countAccreditations: HasManyCountAssociationsMixin;
  declare public createAccreditation: HasManyCreateAssociationMixin<Accreditation>;
}

EventSchedule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Event,
        key: 'id',
      },
    },
    scheduleName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    maxCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: 'EventSchedule',
    tableName: 'event_schedules',
    timestamps: true,
    underscored: true,
  }
);

// Associations
Event.hasMany(EventSchedule, { foreignKey: 'eventId' });
EventSchedule.belongsTo(Event, { foreignKey: 'eventId' });

// Note: The Many-to-Many association with Participant is defined in Participant.ts to avoid circular dependency issues during initialization order,
// or it can be defined here as well if imports are handled carefully.
// For clarity, we will rely on the definition in Participant.ts or index.ts if we had one centralizing associations.

export default EventSchedule;
