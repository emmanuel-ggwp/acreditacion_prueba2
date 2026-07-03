import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';

class GiftType extends Model {
  declare public id: string;
  declare public campaignId: string;
  declare public name: string;
  // FAMILY = 1 por empleado; CHILD = 1 por carga hijo; CARGA = 1 por carga
  declare public basis: 'FAMILY' | 'CHILD' | 'CARGA';
  declare public order: number;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

GiftType.init(
  {
    id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    basis: { type: DataTypes.ENUM('FAMILY', 'CHILD', 'CARGA'), defaultValue: 'FAMILY', allowNull: false },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, modelName: 'GiftType', tableName: 'gift_types', timestamps: true }
);

export default GiftType;
