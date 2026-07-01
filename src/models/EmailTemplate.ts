import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';

class EmailTemplate extends Model {
  declare public id: string;
  declare public name: string;
  declare public templateId: string;
  declare public description: string | null;
  declare public isActive: boolean;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

EmailTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    templateId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Template ID de EmailJS',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: 'EmailTemplate',
    tableName: 'email_templates',
    timestamps: true,
    paranoid: true,
  }
);

export default EmailTemplate;
