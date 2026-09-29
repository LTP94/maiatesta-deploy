# maiatesta-whatsapp-backend

Backend de onboarding, persistencia multiempresa y (en etapas futuras) webhook + integraciones para conectar números de WhatsApp Business de clientes vía **Coexistence**. Ver `ARCHITECTURE_DECISION.md` para el porqué de este servicio separado del repo principal (Vercel) y para el detalle de la revisión de seguridad/arquitectura (comunicación Vercel↔Hostinger, aislamiento multiempresa en dos capas, despliegue aislado, gestión de claves).

**Estado: Etapa 1 completa + revisión de seguridad aprobada en principio.** Sin endpoints de onboarding/webhook todavía (Etapas 2-3, pendientes de aprobación explícita).

## Requisitos

- Node.js ≥ 20
- Docker + Docker Compose (para Postgres/Redis locales — **nunca** para producción)

## Puesta en marcha (desarrollo local)

```bash
cd backend
cp .env.example .env
# Genera valores propios para META_TOKEN_ENCRYPTION_KEY / META_ONBOARDING_SESSION_SECRET
# / META_WHATSAPP_WEBHOOK_VERIFY_TOKEN con: openssl rand -hex 32

npm install
docker compose up -d          # levanta Postgres + Redis de DESARROLLO (puertos 55561/55562)
npx prisma migrate dev        # aplica el esquema + crea el rol app_runtime (sin contraseña todavía)

# Fija la contraseña de app_runtime (rol RLS-restringido que usa el servidor en runtime):
docker exec -e PGPASSWORD=dev_only_password_never_use_in_prod \
  maiatesta-whatsapp-backend-postgres-1 \
  psql -U maiatesta_dev -d maiatesta_whatsapp_dev -c \
  "ALTER ROLE app_runtime WITH PASSWORD '$(openssl rand -hex 24)';"
# (o scripts/bootstrap-db-roles.sh si tienes psql instalado localmente)
# Copia esa misma contraseña a RUNTIME_DATABASE_URL en tu .env

npm run dev                   # servidor en :4000 con recarga en caliente
```

```bash
curl http://localhost:4000/health
# {"ok":true,"service":"maiatesta-whatsapp-backend","database":"connected",...}
```

## Pruebas

Las pruebas de integración corren contra una base de datos **separada** de la de desarrollo (puertos 55563/55564, `docker-compose.test.yml`) — nunca comparten datos ni contenedor. Los archivos de `tests/integration/` corren en serie, no en paralelo (`vitest.config.ts`, `fileParallelism: false`) porque comparten una base de datos Postgres real.

```bash
npm run docker:test:up
DATABASE_URL="postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public" \
  npx prisma migrate deploy

# Fija la contraseña de app_runtime en la BD de pruebas (igual que en desarrollo, arriba)
docker exec -e PGPASSWORD=test_only_password_never_use_in_prod \
  maiatesta-whatsapp-backend-postgres-test-1 \
  psql -U maiatesta_test -d maiatesta_whatsapp_test -c \
  "ALTER ROLE app_runtime WITH PASSWORD 'una-contraseña-de-prueba';"

TEST_DATABASE_URL="postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public" \
TEST_RUNTIME_DATABASE_URL="postgresql://app_runtime:una-contraseña-de-prueba@localhost:55563/maiatesta_whatsapp_test?schema=public" \
  npm test

npm run docker:test:down      # limpia los contenedores de prueba al terminar
```

Sin `TEST_RUNTIME_DATABASE_URL`, las pruebas de Row-Level Security se saltan automáticamente (`describe.skip`) en vez de fallar — para que `npm test` siga siendo ejecutable sin el paso de bootstrap si solo se quiere correr las pruebas de aislamiento por aplicación.

## Estructura

```
backend/
├── ARCHITECTURE_DECISION.md         ← decisión + revisión de seguridad completa, con evidencia
├── docker-compose.yml               ← Postgres+Redis de desarrollo
├── docker-compose.test.yml          ← Postgres+Redis de pruebas (aislados)
├── docker-compose.hostinger.yml     ← plantilla de despliegue (NO ejecutada) — red propia, límites de recursos
├── .env.hostinger.example           ← variables que necesita el compose de Hostinger
├── prisma/
│   ├── schema.prisma                ← modelo de datos multiempresa
│   └── migrations/
│       ├── .../init                          ← esquema base
│       └── .../enable_row_level_security     ← rol app_runtime + políticas RLS
├── scripts/
│   ├── bootstrap-db-roles.sh        ← fija/rota la contraseña de app_runtime por ambiente
│   └── rotate-encryption-key.ts     ← CLI de rotación de META_TOKEN_ENCRYPTION_KEY
├── src/
│   ├── config/env.ts                ← loaders de env vars, fail-closed
│   ├── db/client.ts                 ← Prisma conectado como app_runtime (no como dueño)
│   ├── crypto/
│   │   ├── tokenCipher.ts           ← AES-256-GCM para credenciales en reposo
│   │   └── rotateKey.ts             ← rotación de clave, tenant por tenant
│   ├── access/invitationToken.ts    ← token firmado para pre-autorizar qué tenant puede iniciar onboarding
│   ├── tenancy/isolation.ts         ← TenantScope — Capa 1 (aplicación) del aislamiento
│   ├── routes/health.ts
│   └── index.ts
├── tests/
│   ├── unit/                        ← cifrado, token de invitación (19 casos)
│   └── integration/                 ← aislamiento por aplicación, Row-Level Security, rotación de clave (21 casos, Postgres real)
```

## Lo que NO existe todavía (por diseño, en espera de aprobación)

- Endpoints de onboarding (`/onboarding/start`, `/session`, `/complete`) — Etapa 2. `src/access/invitationToken.ts` es el primitivo que usarían, ya probado, pero no está conectado a ninguna ruta.
- Webhook de Meta + clasificación de mensajes (cliente vs. eco de empleado vs. API) — Etapa 3.
- Adaptadores de Evolution API / Chatwoot / Typebot / n8n — Etapa 4.
- Cualquier despliegue real a Hostinger — `docker-compose.hostinger.yml` es una plantilla, nunca se ejecutó. `HOSTINGER_INTEGRATION_GUIDE.md` (se escribe al final) empieza con diagnóstico de solo lectura.
- Rate limiting y CORS configurados en código — están documentados con el valor exacto a usar (`ARCHITECTURE_DECISION.md`, Punto 1) pero no hay ninguna ruta pública de onboarding todavía que protejan.

## Seguridad — reglas que este directorio ya sigue

- **Aislamiento multiempresa en dos capas independientes**, no solo una: `TenantScope` (aplicación) + Row-Level Security de Postgres (base de datos, rol `app_runtime` sin `BYPASSRLS`, fail-closed). Ver `ARCHITECTURE_DECISION.md`, Punto 2, para el detalle completo y las 21 pruebas que lo confirman.
- Nunca loguear tokens, códigos de autorización, ni el valor crudo de un secreto (`pino` con `redact` en `index.ts`, mismo principio que `server/meta/*` del repo Vercel).
- `META_TOKEN_ENCRYPTION_KEY` es independiente de `META_APP_SECRET` — nunca se deriva uno del otro. La clave y el backup de la base de datos nunca deben coexistir en el mismo respaldo (ver Punto 4).
- El servidor Express se conecta a Postgres como `app_runtime` (`RUNTIME_DATABASE_URL`) — nunca como el rol dueño de las tablas (`DATABASE_URL`, exclusivo de migraciones).
- `phoneNumberId` y `wabaId` son `@unique` a nivel de base de datos — un número o WABA no puede quedar asociado a dos tenants aunque la capa de aplicación tenga un bug (probado explícitamente).
- Ningún token de invitación, contraseña de rol, ni clave de cifrado se genera con un valor real en esta conversación ni queda en un archivo versionado — `.gitignore` excluye `.env`/`.env.*` con excepción solo de los `*.example`.
