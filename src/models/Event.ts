
import { 
  Model, 
  DataTypes, 
  UUIDV4,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
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
import User from './User';
import EventSchedule from './EventSchedule';

class Event extends Model {
  declare public id: string;
  declare public name: string;
  declare public description: string | null;
  declare public location: string | null;
  declare public isActive: boolean;
  declare public maxCapacity: number | null;
  declare public allowGuests: boolean;
  declare public maxGuestsPerParticipant: number;
  declare public createdBy: string;
  
  declare public EventSchedules?: EventSchedule[];

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Mixins for User (CreatedBy)
  declare public getUser: BelongsToGetAssociationMixin<User>;
  declare public setUser: BelongsToSetAssociationMixin<User, string>;
  declare public createUser: BelongsToCreateAssociationMixin<User>;

  // Mixins for EventSchedule
  declare public getEventSchedules: HasManyGetAssociationsMixin<EventSchedule>;
  declare public addEventSchedule: HasManyAddAssociationMixin<EventSchedule, string>;
  declare public addEventSchedules: HasManyAddAssociationsMixin<EventSchedule, string>;
  declare public setEventSchedules: HasManySetAssociationsMixin<EventSchedule, string>;
  declare public removeEventSchedule: HasManyRemoveAssociationMixin<EventSchedule, string>;
  declare public removeEventSchedules: HasManyRemoveAssociationsMixin<EventSchedule, string>;
  declare public hasEventSchedule: HasManyHasAssociationMixin<EventSchedule, string>;
  declare public hasEventSchedules: HasManyHasAssociationsMixin<EventSchedule, string>;
  declare public countEventSchedules: HasManyCountAssociationsMixin;
  declare public createEventSchedule: HasManyCreateAssociationMixin<EventSchedule>;
}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    maxCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    allowGuests: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    maxGuestsPerParticipant: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
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
    modelName: 'Event',
    tableName: 'events',
    timestamps: true,
    paranoid: true,
  }
);

// Associations
User.hasMany(Event, { foreignKey: 'createdBy' });
Event.belongsTo(User, { foreignKey: 'createdBy' });

export default Event;
