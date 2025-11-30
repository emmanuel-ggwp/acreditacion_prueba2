
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Event from './Event';

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
  },
  {
    sequelize,
    modelName: 'EventSchedule',
    tableName: 'event_schedules',
    timestamps: true,
  }
);

// Associations
Event.hasMany(EventSchedule, { foreignKey: 'eventId' });
EventSchedule.belongsTo(Event, { foreignKey: 'eventId' });

export default EventSchedule;
