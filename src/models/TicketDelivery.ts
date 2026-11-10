import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';

class TicketDelivery extends Model {
  declare public id: string;
  declare public participantId: string;
  declare public scheduleId: string | null;
  declare public quantity: number;
  declare public deliveredAt: Date;
  declare public deliveredBy: string | null;
}

TicketDelivery.init({
  id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
  participantId: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'participants', key: 'id' }, onDelete: 'CASCADE' },
  scheduleId: { type: DataTypes.UUID, allowNull: true, references: { model: 'event_schedules', key: 'id' }, onDelete: 'SET NULL' },
  quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, isInt: true } },
  deliveredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  deliveredBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
}, { sequelize, modelName: 'TicketDelivery', tableName: 'ticket_deliveries', timestamps: true });

export default TicketDelivery;
