
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import User from './User';

class Participant extends Model {
  declare public id: string;
  declare public firstName: string;
  declare public lastName: string;
  declare public email: string;
  declare public phone: string | null;
  declare public documentNumber: string | null;
  declare public company: string | null;
  declare public position: string | null;
  declare public allowedGuests: number;
  declare public createdBy: string;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
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
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    allowedGuests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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

export default Participant;
