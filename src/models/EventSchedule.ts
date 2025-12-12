
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
  // Status:
  // - published: Visible/Upcoming (default)
  // - accrediting: Check-in is currently open
  // - accredited: Event finished, accreditation closed
  // - cancelled: Schedule cancelled
  declare public status: 'published' | 'accrediting' | 'accredited' | 'cancelled';

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
    status: {
      type: DataTypes.STRING,
      defaultValue: 'published',
      allowNull: false,
      comment: 'published: Visible/Upcoming, accrediting: Check-in open, accredited: Finished/Closed, cancelled: Cancelled'
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
  }
);

// Associations
Event.hasMany(EventSchedule, { foreignKey: 'eventId' });
EventSchedule.belongsTo(Event, { foreignKey: 'eventId' });

// Note: The Many-to-Many association with Participant is defined in Participant.ts to avoid circular dependency issues during initialization order,
// or it can be defined here as well if imports are handled carefully.
// For clarity, we will rely on the definition in Participant.ts or index.ts if we had one centralizing associations.

export default EventSchedule;
