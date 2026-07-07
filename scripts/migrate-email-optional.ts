import { sequelize } from '../src/lib/sequelize';

// Hace opcional el correo del participante (en precargas/cargas masivas solo el RUT es obligatorio).
// Idempotente: DROP NOT NULL no falla si ya está aplicado.
const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.query(`ALTER TABLE "participants" ALTER COLUMN "email" DROP NOT NULL;`);
    console.log('OK: participants.email ahora es opcional.');
    process.exit(0);
  } catch (e) {
    console.error('Falló la migración:', e);
    process.exit(1);
  }
};

run();
