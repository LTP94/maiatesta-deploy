#!/usr/bin/env bash
# Fija (o rota) la contraseña del rol app_runtime creado por la migración
# 20260929180000_enable_row_level_security. Deliberadamente FUERA del
# historial de migraciones de Prisma — la contraseña nunca debe quedar en
# un archivo versionado; este script la toma de una variable de entorno en
# el momento de ejecutarse, nunca la imprime, nunca la loguea.
#
# Uso:
#   APP_RUNTIME_DB_PASSWORD="$(openssl rand -hex 24)" \
#   OWNER_DATABASE_URL="postgresql://owner_user:owner_pass@host:5432/dbname" \
#   ./scripts/bootstrap-db-roles.sh
#
# Solo de solo-escritura sobre la contraseña del rol — no toca esquema, no
# toca datos, no toca ningún otro rol ni servicio de Hostinger.
set -euo pipefail

if [[ -z "${APP_RUNTIME_DB_PASSWORD:-}" ]]; then
  echo "ERROR: APP_RUNTIME_DB_PASSWORD no está definida. No se imprime ningún valor por seguridad." >&2
  exit 1
fi

if [[ -z "${OWNER_DATABASE_URL:-}" ]]; then
  echo "ERROR: OWNER_DATABASE_URL no está definida (debe ser la del rol dueño de las tablas, no app_runtime)." >&2
  exit 1
fi

psql "${OWNER_DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
ALTER ROLE app_runtime WITH PASSWORD '${APP_RUNTIME_DB_PASSWORD}';
SQL

echo "app_runtime password set/rotated. No value was printed above."
