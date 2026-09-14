import type { Sequelize } from 'sequelize';

/**
 * 0003 — Estado de envío de correo por participante.
 *
 * El correo de confirmación se envía best-effort desde el navegador (EmailJS) y hasta
 * ahora su resultado se descartaba. Se agregan columnas para persistir ese resultado:
 *  - email_status: 'sent' | 'failed' | 'skipped'; NULL = no enviado / nunca intentado.
 *  - email_error: texto del error de envío (cuando falló).
 *  - email_sent_at: fecha del último envío correcto.
 *
 * DDL explícito e idempotente. No toca datos existentes (columnas nuevas = NULL).
 */
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query(`
    ALTER TABLE participants
      ADD COLUMN IF NOT EXISTS email_status varchar(16),
      ADD COLUMN IF NOT EXISTS email_error text,
      ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
  `);
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query(`
    ALTER TABLE participants
      DROP COLUMN IF EXISTS email_status,
      DROP COLUMN IF EXISTS email_error,
      DROP COLUMN IF EXISTS email_sent_at;
  `);
};
