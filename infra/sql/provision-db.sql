-- infra/sql/provision-db.sql — tabla del limitador y permisos del usuario de
-- aplicación en la base ADMINISTRADA de DigitalOcean (plan 07 fase 3; I4 de la
-- fase 2 y P08-D8.4).
--
-- Se ejecuta COMO doadmin (o el usuario de despliegue), NUNCA como el usuario
-- de aplicación:
--
--   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -v app_user='<usuario_app>' -v db_name='<base>' \
--        -f infra/sql/provision-db.sql
--
-- (provision.sh lo lanza así si se le dan ADMIN_DATABASE_URL, APP_DB_USER y
-- APP_DB_NAME; la URL lleva credenciales y no se imprime jamás — R2.)
--
-- DOS identidades de conexión (I4, fase 2):
--   - migraciones y aprovisionamiento: doadmin — crean tablas. Desde
--     PostgreSQL 15 el usuario de aplicación NO tiene CREATE en `public`,
--     y así debe seguir.
--   - servicio: usuario de aplicación con SOLO DML. DELETE incluido: el
--     limitador purga las claves expiradas (clearExpiredByTimeout).
--
-- El usuario de aplicación se crea en la CONSOLA de DigitalOcean (no aquí):
-- si no existe, este script falla nombrándolo — que es lo correcto.

-- La tabla del limitador la crea el APROVISIONAMIENTO: la aplicación nunca
-- necesita CREATE (P08-D8.4; la sonda del limitador es un SELECT, no el
-- CREATE de la librería). Mismo DDL que emite rate-limiter-flexible y que
-- src/scripts/sync-db.ts.
CREATE TABLE IF NOT EXISTS rate_limits (
  key varchar(255) PRIMARY KEY,
  points integer NOT NULL DEFAULT 0,
  expire bigint
);

GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

-- Las tablas y secuencias que doadmin cree DESPUÉS (migraciones futuras)
-- heredan los mismos permisos sin repetir el GRANT. Ojo: aplica a los objetos
-- creados por QUIEN ejecuta este script — por eso las migraciones deben correr
-- con esa misma identidad (doadmin/despliegue), no con otra.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
