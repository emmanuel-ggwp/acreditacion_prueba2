import { sequelize } from '../src/lib/sequelize';
import User from '../src/models/User';

const seedUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    const users = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN' as const,
        isActive: true,
      },
      {
        username: 'acreditador',
        email: 'acreditador@example.com',
        password: 'password123',
        firstName: 'Acreditador',
        lastName: 'User',
        role: 'ACREDITADOR' as const,
        isActive: true,
      },
      {
        username: 'guardia',
        email: 'guardia@example.com',
        password: 'password123',
        firstName: 'Guardia',
        lastName: 'User',
        role: 'GUARDIA' as const,
        isActive: true,
      },
    ];

    console.log('Seeding users...');

    for (const userData of users) {
      // We use findOne first to avoid unique constraint errors if we just tried create
      // and to decide whether to create. findOrCreate is also an option.
      const existingUser = await User.findOne({ where: { email: userData.email } });

      if (!existingUser) {
        await User.create(userData);
        console.log(`User ${userData.username} created.`);
      } else {
        console.log(`User ${userData.username} already exists.`);
      }
    }

    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
