import { sequelize } from '../src/lib/sequelize';

// Migración idempotente: agrega las columnas para los modos de invitados (count / companion).
// Segura de correr varias veces y en producción (ADD COLUMN IF NOT EXISTS, sin tocar datos).
const run = async () => {
  try {
    await sequelize.authenticate();
    const statements = [
      `ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "guest_count" INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "guest_companion" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "guest_loads" INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE "accreditations" ADD COLUMN IF NOT EXISTS "guest_count" INTEGER NOT NULL DEFAULT 0;`,
    ];
    for (const sql of statements) {
      await sequelize.query(sql);
      console.log('OK: ' + sql);
    }
    console.log('\n✅ Migración de modos de invitados aplicada.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Falló la migración:', e);
    process.exit(1);
  }
};

run();
