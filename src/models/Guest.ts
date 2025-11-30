
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Participant from './Participant';

class Guest extends Model {
  declare public id: string;
  declare public participantId: string;
  declare public firstName: string;
  declare public lastName: string;
  declare public documentNumber: string | null;

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
      allowNull: false,
    },
    documentNumber: {
      type: DataTypes.STRING,
      allowNull: true,
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
Participant.hasMany(Guest, { foreignKey: 'participantId' });
Guest.belongsTo(Participant, { foreignKey: 'participantId' });

export default Guest;
