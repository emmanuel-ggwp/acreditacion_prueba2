
import {
  Model,
  DataTypes,
  UUIDV4,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../lib/sequelize'; // Asumimos que la conexión está en /lib/sequelize

console.log('Initializing User model...');

class User extends Model {
  declare public id: string;
  declare public username: string;
  declare public email: string;
  declare public password: string;
  declare public firstName: string;
  declare public lastName: string;
  declare public role: 'ADMIN' | 'ACREDITADOR' | 'GUARDIA';
  declare public isActive: boolean;
  declare public lastLogin: Date | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  // Instance method to compare passwords
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'ACREDITADOR', 'GUARDIA'),
      allowNull: false,
      defaultValue: 'ACREDITADOR',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true, // For soft deletes
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['username'],
      },
    ],
  }
);

// Hooks to hash password
User.addHook('beforeSave', async (user: User) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

export default User;
