
import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import Event from './Event';

class Award extends Model {
  declare public id: string;
  declare public eventId: string;
  declare public name: string;
  declare public description: string | null;
  declare public quantity: number;
  declare public isActive: boolean;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Award.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: 'Award',
    tableName: 'awards',
    timestamps: true,
  }
);

Award.addHook('beforeUpdate', (instance: Award) => {
  if (instance.quantity < 0) {
    throw new Error('Award quantity cannot be negative.');
  }
});

Award.addHook('beforeCreate', (instance: Award) => {
  if (instance.quantity < 0) {
    throw new Error('Award quantity cannot be negative.');
  }
});


// Associations
Event.hasMany(Award, { foreignKey: 'eventId' });
Award.belongsTo(Event, { foreignKey: 'eventId' });

export default Award;
