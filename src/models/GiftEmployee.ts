import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';

class GiftEmployee extends Model {
  declare public id: string;
  declare public campaignId: string;
  declare public fullName: string;
  declare public rut: string | null;
  declare public empresa: string | null;
  declare public cargas: number;
  declare public cargasHijos: number;
  declare public source: 'IMPORT' | 'MANUAL';
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

GiftEmployee.init(
  {
    id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    rut: { type: DataTypes.STRING, allowNull: true },
    empresa: { type: DataTypes.STRING, allowNull: true },
    cargas: { type: DataTypes.INTEGER, defaultValue: 0 },
    cargasHijos: { type: DataTypes.INTEGER, defaultValue: 0 },
    source: { type: DataTypes.ENUM('IMPORT', 'MANUAL'), defaultValue: 'IMPORT', allowNull: false },
  },
  { sequelize, modelName: 'GiftEmployee', tableName: 'gift_employees', timestamps: true, paranoid: true }
);

export default GiftEmployee;
