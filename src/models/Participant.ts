
import { 
  Model, 
  DataTypes, 
  UUIDV4, 
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
import User from './User';
import EventSchedule from './EventSchedule';
import Event from './Event';
import type Guest from './Guest';

class Participant extends Model {
  declare public id: string;
  declare public firstName: string;
  declare public lastName: string;
  declare public email: string;
  declare public phone: string | null;
  declare public documentNumber: string | null;
  declare public numeroSap: string | null;
  declare public company: string | null;
  declare public position: string | null;
  declare public dietaryPreference: string;
  declare public dietaryComments: string | null;
  declare public allowedGuests: number;
  declare public registrationSource: 'MANUAL' | 'IMPORT' | 'PUBLIC_FORM';
  declare public isNew: boolean;
  declare public eventId: string | null;
  declare public birthDate: string | null;
  declare public age: number | null;
  declare public customData: Record<string, any> | null;
  declare public isAwarded: boolean;
  declare public awardReason: string | null;
  declare public allowMultipleSchedules: boolean;
  declare public createdBy: string;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Association Mixins
  declare public addEventSchedule: BelongsToManyAddAssociationMixin<EventSchedule, string>;
  declare public addEventSchedules: BelongsToManyAddAssociationsMixin<EventSchedule, string>;
  declare public getEventSchedules: BelongsToManyGetAssociationsMixin<EventSchedule>;
  declare public hasEventSchedule: BelongsToManyHasAssociationMixin<EventSchedule, string>;
  declare public hasEventSchedules: BelongsToManyHasAssociationsMixin<EventSchedule, string>;
  declare public removeEventSchedule: BelongsToManyRemoveAssociationMixin<EventSchedule, string>;
  declare public removeEventSchedules: BelongsToManyRemoveAssociationsMixin<EventSchedule, string>;
  declare public setEventSchedules: BelongsToManySetAssociationsMixin<EventSchedule, string>;
  declare public countEventSchedules: BelongsToManyCountAssociationsMixin;

  declare public EventSchedules?: EventSchedule[];
  declare public guests?: Guest[];

  // Mixins for Guest
  declare public getGuests: HasManyGetAssociationsMixin<Guest>;
  declare public addGuest: HasManyAddAssociationMixin<Guest, string>;
  declare public addGuests: HasManyAddAssociationsMixin<Guest, string>;
  declare public setGuests: HasManySetAssociationsMixin<Guest, string>;
  declare public removeGuest: HasManyRemoveAssociationMixin<Guest, string>;
  declare public removeGuests: HasManyRemoveAssociationsMixin<Guest, string>;
  declare public hasGuest: HasManyHasAssociationMixin<Guest, string>;
  declare public hasGuests: HasManyHasAssociationsMixin<Guest, string>;
  declare public countGuests: HasManyCountAssociationsMixin;
  declare public createGuest: HasManyCreateAssociationMixin<Guest>;
}

Participant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    numeroSap: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dietaryPreference: {
      type: DataTypes.STRING,
      defaultValue: 'NONE',
      allowNull: false,
    },
    dietaryComments: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Detalles de alergias o especificaciones adicionales',
    },
    allowedGuests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    registrationSource: {
      type: DataTypes.ENUM('MANUAL', 'IMPORT', 'PUBLIC_FORM'),
      defaultValue: 'MANUAL',
      allowNull: false,
    },
    isNew: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Nullable por ahora (Plan 2). La carga masiva (Plan 5.5) y la landing (Plan 5)
    // siempre lo poblarán; luego puede endurecerse a NOT NULL.
    eventId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Event,
        key: 'id',
      },
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Valores de campos personalizados definidos por el evento',
    },
    isAwarded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    awardReason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Motivo de premiación (opcional)',
    },
    allowMultipleSchedules: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Override: este participante puede inscribirse en varias fechas aunque el evento no lo permita',
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
      onUpdate: sequelize.literal('CURRENT_TIMESTAMP') as any,
    },
  },
  {
    sequelize,
    modelName: 'Participant',
    tableName: 'participants',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['email'],
      },
      {
        fields: ['document_number'],
      },
    ],
  }
);

// Associations
User.hasMany(Participant, { foreignKey: 'createdBy' });
Participant.belongsTo(User, { foreignKey: 'createdBy' });
Event.hasMany(Participant, { foreignKey: 'eventId', as: 'participants' });
Participant.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

export default Participant;
