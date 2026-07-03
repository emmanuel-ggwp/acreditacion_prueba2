import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';

class GiftDelivery extends Model {
  declare public id: string;
  declare public employeeId: string;
  declare public giftTypeId: string;
  declare public deliveredQty: number;
  declare public deliveredAt: Date | null;
  declare public deliveredBy: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

GiftDelivery.init(
  {
    id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    giftTypeId: { type: DataTypes.UUID, allowNull: false },
    deliveredQty: { type: DataTypes.INTEGER, defaultValue: 0 },
    deliveredAt: { type: DataTypes.DATE, allowNull: true },
    deliveredBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    modelName: 'GiftDelivery',
    tableName: 'gift_deliveries',
    timestamps: true,
    indexes: [{ unique: true, fields: ['employee_id', 'gift_type_id'] }],
  }
);

export default GiftDelivery;
