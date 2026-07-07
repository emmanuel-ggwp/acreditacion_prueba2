import { sequelize } from '../src/lib/sequelize';
import User from '../src/models/User';

const seedUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    const users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN' as const,
        isActive: true,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        username: 'acreditador',
        email: 'acreditador@example.com',
        password: 'password123',
        firstName: 'Acreditador',
        lastName: 'User',
        role: 'OPERATOR' as const,
        isActive: true,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
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

    // Usuario "sistema" requerido por los audit logs automáticos
    // (ej. SYSTEM-BULK-UPDATE en eventService). Su id está hardcodeado en el código
    // (eventService.ts) — pendiente de limpieza en el Plan 8.
    const SYSTEM_USER_ID = '90eb6c3a-6654-449a-b1d4-a2f05b9f80f1';
    const existingSystem = await User.findByPk(SYSTEM_USER_ID);
    if (!existingSystem) {
      await User.create({
        id: SYSTEM_USER_ID,
        username: 'system',
        email: 'system@system.local',
        password: `system-${SYSTEM_USER_ID}`,
        firstName: 'Sistema',
        lastName: '',
        role: 'ADMIN' as const,
        isActive: false,
      });
      console.log('System user created.');
    } else {
      console.log('System user already exists.');
    }

    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
