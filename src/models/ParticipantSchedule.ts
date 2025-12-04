import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Participant from './Participant';
import EventSchedule from './EventSchedule';

class ParticipantSchedule extends Model {
  declare public id: string;
  declare public participantId: string;
  declare public scheduleId: string;
  declare public attended: boolean;
  declare public attendedAt: Date | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ParticipantSchedule.init(
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
    scheduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: EventSchedule,
        key: 'id',
      },
    },
    attended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attendedAt: {
      type: DataTypes.DATE,
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
      onUpdate: sequelize.literal('CURRENT_TIMESTAMP') as any,
    },
  },
  {
    sequelize,
    modelName: 'ParticipantSchedule',
    tableName: 'participant_schedules',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['participant_id', 'schedule_id'],
      },
    ],
  }
);

export default ParticipantSchedule;
