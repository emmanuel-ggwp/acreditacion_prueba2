
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import User from './User';

class RefreshToken extends Model {
  declare public id: string;
  declare public userId: string;
  declare public token: string;
  declare public expiresAt: Date;
  declare public isRevoked: boolean;

  declare public readonly createdAt: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true,
    updatedAt: false, // No 'updatedAt' for this model
  }
);

// Associations
User.hasMany(RefreshToken, { foreignKey: 'userId' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

export default RefreshToken;
