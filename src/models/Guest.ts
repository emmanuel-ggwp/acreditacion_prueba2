
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Participant from './Participant';

class Guest extends Model {
  declare public id: string;
  declare public participantId: string;
  declare public firstName: string;
  declare public lastName: string | null;
  declare public documentNumber: string | null;
  declare public email: string | null;
  declare public phone: string | null;
  declare public birthDate: string | null;
  declare public age: number | null;
  declare public guestType: string | null;
  declare public relationship: string | null;
  declare public dietaryPreference: string | null;
  declare public customData: Record<string, any> | null;
  declare public confirmed: boolean;
  declare public scheduleId: string | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Guest.init(
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
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    documentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    guestType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Tipo de invitado configurable por evento (ej. CARGA, ACOMPANANTE)',
    },
    relationship: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Parentesco o relación con el participante',
    },
    dietaryPreference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Preferencia alimenticia del invitado (ej. VEGETARIAN), si el evento la pide',
    },
    customData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Valores de campos personalizados de invitado definidos por el evento',
    },
    confirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el invitado/carga fue confirmado para asistir',
    },
    scheduleId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Horario/fecha al que el invitado fue confirmado',
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
    modelName: 'Guest',
    tableName: 'guests',
    timestamps: true,
    paranoid: true,
  }
);

// Associations
Participant.hasMany(Guest, { foreignKey: 'participantId', as: 'guests' });
Guest.belongsTo(Participant, { foreignKey: 'participantId', as: 'participant' });

export default Guest;
