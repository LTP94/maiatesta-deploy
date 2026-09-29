-- Row-Level Security — segunda capa de aislamiento multiempresa, aplicada
-- por Postgres mismo, no por disciplina de programador.
--
-- Por qué esto es necesario además de TenantScope (src/tenancy/isolation.ts):
-- TenantScope es correcto HOY, pero es una convención de código — nada
-- impide que un desarrollador futuro (o un bug, o una migración de
-- refactor) llame a `prisma.phoneNumber.findMany()` sin pasar por
-- TenantScope y obtenga filas de todos los tenants. RLS cierra esa puerta
-- a nivel de base de datos: incluso una query cruda sin ningún `where`
-- devuelve únicamente las filas del tenant activo en la sesión, o CERO
-- filas si no se fijó ningún tenant — fail-closed por diseño, no fail-open.
--
-- Importante — quién puede eludir RLS: el DUEÑO de una tabla y los
-- superusuarios de Postgres ignoran RLS por defecto. Por eso este backend
-- se conecta en runtime como un rol NUEVO, `app_runtime`, que NO es dueño
-- de ninguna tabla y tiene NOBYPASSRLS explícito — las migraciones siguen
-- corriendo con el rol dueño (DATABASE_URL), pero el servidor Express
-- corre con RUNTIME_DATABASE_URL (ver src/db/client.ts). La contraseña de
-- app_runtime NO se fija aquí (no debe versionarse) — la fija
-- scripts/bootstrap-db-roles.sh por ambiente, leyendo APP_RUNTIME_DB_PASSWORD.
--
-- Nota de nombres de columna: Prisma no tiene @map por campo en este
-- esquema, así que las columnas quedan en camelCase tal cual el nombre del
-- campo (p. ej. "tenantId", no "tenant_id") — Postgres requiere comillas
-- dobles para preservar esa mayúscula/minúscula.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
-- Sin DROP/TRUNCATE/ALTER — app_runtime puede operar datos, nunca cambiar
-- esquema ni vaciar tablas completas.

-- ---------------------------------------------------------------------------
-- Tablas con tenantId directo
-- ---------------------------------------------------------------------------

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant_id', true));

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users FORCE ROW LEVEL SECURITY;
CREATE POLICY admin_users_isolation ON admin_users
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY onboarding_sessions_isolation ON onboarding_sessions
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE meta_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_authorizations FORCE ROW LEVEL SECURITY;
CREATE POLICY meta_authorizations_isolation ON meta_authorizations
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
-- audit_logs.tenantId es NULLABLE (eventos de sistema sin tenant) — esas
-- filas quedan invisibles a todos los tenants por igual (ninguna cláusula
-- las hace visibles), correcto: son para un futuro rol de administración
-- interna, no para el aislamiento por tenant.
CREATE POLICY audit_logs_isolation ON audit_logs
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- ---------------------------------------------------------------------------
-- Tablas alcanzadas solo por relación — la política es una subquery que
-- atraviesa la misma cadena que TenantScope ya usa en la capa de aplicación,
-- pero ahora también la aplica Postgres.
-- ---------------------------------------------------------------------------

ALTER TABLE whatsapp_business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_business_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY waba_isolation ON whatsapp_business_accounts
  USING (
    "metaAuthorizationId" IN (
      SELECT id FROM meta_authorizations
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)
    )
  );

ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers FORCE ROW LEVEL SECURITY;
CREATE POLICY phone_numbers_isolation ON phone_numbers
  USING (
    "whatsappBusinessAccountId" IN (
      SELECT waba.id FROM whatsapp_business_accounts waba
      JOIN meta_authorizations auth ON auth.id = waba."metaAuthorizationId"
      WHERE auth."tenantId" = current_setting('app.current_tenant_id', true)
    )
  );

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials FORCE ROW LEVEL SECURITY;
CREATE POLICY credentials_isolation ON credentials
  USING (
    "metaAuthorizationId" IN (
      SELECT id FROM meta_authorizations
      WHERE "tenantId" = current_setting('app.current_tenant_id', true)
    )
  );

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs FORCE ROW LEVEL SECURITY;
CREATE POLICY integration_configs_isolation ON integration_configs
  USING (
    "phoneNumberId" IN (
      SELECT pn.id FROM phone_numbers pn
      JOIN whatsapp_business_accounts waba ON waba.id = pn."whatsappBusinessAccountId"
      JOIN meta_authorizations auth ON auth.id = waba."metaAuthorizationId"
      WHERE auth."tenantId" = current_setting('app.current_tenant_id', true)
    )
  );

ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_events FORCE ROW LEVEL SECURITY;
CREATE POLICY message_events_isolation ON message_events
  USING (
    "phoneNumberId" IN (
      SELECT pn.id FROM phone_numbers pn
      JOIN whatsapp_business_accounts waba ON waba.id = pn."whatsappBusinessAccountId"
      JOIN meta_authorizations auth ON auth.id = waba."metaAuthorizationId"
      WHERE auth."tenantId" = current_setting('app.current_tenant_id', true)
    )
  );

-- Nota sobre FORCE ROW LEVEL SECURITY: sin esto, el DUEÑO de la tabla queda
-- exento de RLS incluso teniendo políticas activas. app_runtime no es dueño
-- así que no lo necesitaría para sí mismo, pero FORCE lo deja explícito e
-- inequívoco para cualquier rol futuro que herede privilegios, y evita que
-- un cambio posterior de ownership reabra la brecha silenciosamente.
