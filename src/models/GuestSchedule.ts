import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Guest from './Guest';
import EventSchedule from './EventSchedule';

/**
 * Tabla puente invitado ⇄ fecha. Permite que un invitado (carga/acompañante) asista a
 * fechas específicas del evento, y que un participante lleve invitados DISTINTOS en cada
 * fecha. Espeja a ParticipantSchedule; el índice único (guest_id, schedule_id) hace que
 * ligar dos veces la misma fecha sea idempotente.
 */
class GuestSchedule extends Model {
  declare public id: string;
  declare public guestId: string;
  declare public scheduleId: string;
  declare public confirmed: boolean;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

GuestSchedule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    guestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Guest,
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
    confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'GuestSchedule',
    tableName: 'guest_schedules',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['guest_id', 'schedule_id'],
      },
    ],
  }
);

export default GuestSchedule;
