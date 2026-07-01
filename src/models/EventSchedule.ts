
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
  declare public location: string | null;
  declare public blockType: 'SINGLE' | 'AM' | 'PM' | 'FULL_DAY' | 'CUSTOM';
  declare public label: string | null;
  declare public imageUrl: string | null;
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
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación específica del bloque; si es null, hereda la del evento',
    },
    blockType: {
      type: DataTypes.ENUM('SINGLE', 'AM', 'PM', 'FULL_DAY', 'CUSTOM'),
      defaultValue: 'SINGLE',
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Etiqueta visible del bloque (ej. Mañana, Tarde)',
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Imagen opcional para la tarjeta de fecha en la landing',
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
Event.hasMany(EventSchedule, { foreignKey: 'eventId', as: 'schedules' });
EventSchedule.belongsTo(Event, { foreignKey: 'eventId' });

// Note: The Many-to-Many association with Participant is defined in Participant.ts to avoid circular dependency issues during initialization order,
// or it can be defined here as well if imports are handled carefully.
// For clarity, we will rely on the definition in Participant.ts or index.ts if we had one centralizing associations.

export default EventSchedule;
