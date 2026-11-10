import type { Sequelize } from 'sequelize';

// Registro independiente: corregir/eliminar una acreditación no habilita otra entrega.
// Una entrega por participante en TODO el evento (también si hay varias fechas).
export const up = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS ticket_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      participant_id uuid NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
      schedule_id uuid REFERENCES event_schedules(id) ON DELETE SET NULL,
      quantity integer NOT NULL CHECK (quantity > 0),
      delivered_at timestamptz NOT NULL DEFAULT now(),
      delivered_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

export const down = async ({ context: sequelize }: { context: Sequelize }) => {
  await sequelize.query('DROP TABLE IF EXISTS ticket_deliveries');
};
