
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Participant from './Participant';
import Award from './Award';
import User from './User';

class ParticipantAward extends Model {
  declare public id: string;
  declare public participantId: string;
  declare public awardId: string;
  declare public assignedBy: string;
  declare public deliveredAt: Date | null;
  declare public deliveredBy: string | null;
  declare public notes: string | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ParticipantAward.init(
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
    awardId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Award,
        key: 'id',
      },
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
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
    modelName: 'ParticipantAward',
    tableName: 'participant_awards',
    timestamps: true,
  }
);

// Associations
Participant.belongsToMany(Award, { through: ParticipantAward, foreignKey: 'participantId' });
Award.belongsToMany(Participant, { through: ParticipantAward, foreignKey: 'awardId' });

Participant.hasMany(ParticipantAward, { foreignKey: 'participantId' });
ParticipantAward.belongsTo(Participant, { foreignKey: 'participantId' });

Award.hasMany(ParticipantAward, { foreignKey: 'awardId' });
ParticipantAward.belongsTo(Award, { foreignKey: 'awardId' });

User.hasMany(ParticipantAward, { foreignKey: 'assignedBy', as: 'AssignedAwards' });
ParticipantAward.belongsTo(User, { foreignKey: 'assignedBy', as: 'Assigner' });

User.hasMany(ParticipantAward, { foreignKey: 'deliveredBy', as: 'DeliveredAwards' });
ParticipantAward.belongsTo(User, { foreignKey: 'deliveredBy', as: 'Deliverer' });


export default ParticipantAward;
