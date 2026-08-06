import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';

// Migración idempotente: agrega `guests.registration_source` (R1-01 / D1.2).
//
// Sin esta columna no hay forma de distinguir una carga precargada por el organizador
// de un acompañante creado desde el landing, y el cupo del asistente lo consumían las
// cargas del organizador.
//
// Las filas existentes quedan como 'MANUAL' (el valor por defecto): son anteriores al
// landing corregido y ninguna debe contar contra el cupo del asistente, que es
// exactamente lo que hace el handler al contar solo 'PUBLIC_FORM'.
//
// Segura de correr varias veces y en producción (ADD COLUMN IF NOT EXISTS, sin tocar datos).
const run = async () => {
  try {
    await sequelize.authenticate();
    const statements = [
      `ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "registration_source" VARCHAR(255) NOT NULL DEFAULT 'MANUAL';`,
    ];
    for (const sql of statements) {
      await sequelize.query(sql);
      console.log('OK: ' + sql);
    }
    console.log('\nMigracion de origen de invitados aplicada.');
    process.exit(0);
  } catch (e) {
    console.error('Fallo la migracion:', e);
    process.exit(1);
  }
};

run();
