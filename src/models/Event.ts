
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
  
  declare public publicSlug: string | null;
  declare public publicTemplate: string | null;
  declare public isPublic: boolean;
  declare public registrationOpen: boolean;
  declare public registrationConfig: any | null;
  declare public logoUrl: string | null;
  declare public backgroundImageUrl: string | null;
  declare public emailTemplateId: string | null;
  declare public allowMultipleSchedules: boolean;

  declare public schedules?: EventSchedule[];

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Mixins for User (CreatedBy)
  declare public getUser: BelongsToGetAssociationMixin<User>;
  declare public setUser: BelongsToSetAssociationMixin<User, string>;
  declare public createUser: BelongsToCreateAssociationMixin<User>;

  // Mixins for EventSchedule
  declare public getSchedules: HasManyGetAssociationsMixin<EventSchedule>;
  declare public addSchedule: HasManyAddAssociationMixin<EventSchedule, string>;
  declare public addSchedules: HasManyAddAssociationsMixin<EventSchedule, string>;
  declare public setSchedules: HasManySetAssociationsMixin<EventSchedule, string>;
  declare public removeSchedule: HasManyRemoveAssociationMixin<EventSchedule, string>;
  declare public removeSchedules: HasManyRemoveAssociationsMixin<EventSchedule, string>;
  declare public hasSchedule: HasManyHasAssociationMixin<EventSchedule, string>;
  declare public hasSchedules: HasManyHasAssociationsMixin<EventSchedule, string>;
  declare public countSchedules: HasManyCountAssociationsMixin;
  declare public createSchedule: HasManyCreateAssociationMixin<EventSchedule>;
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
    publicSlug: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    publicTemplate: {
      type: DataTypes.STRING,
      defaultValue: 'default',
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    registrationOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si es false, la landing pública muestra "Inscripciones cerradas" y rechaza nuevos registros',
    },
    registrationConfig: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    backgroundImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailTemplateId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Plantilla de correo (EmailTemplate) seleccionada para este evento',
    },
    allowMultipleSchedules: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es true, un participante puede inscribirse en varias fechas de este evento',
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
