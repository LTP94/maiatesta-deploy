# maiatesta-whatsapp-backend

Backend de onboarding, persistencia multiempresa y (en etapas futuras) webhook + integraciones para conectar números de WhatsApp Business de clientes vía **Coexistence**. Ver `ARCHITECTURE_DECISION.md` para el porqué de este servicio separado del repo principal (Vercel) y para el detalle de la revisión de seguridad/arquitectura (comunicación Vercel↔Hostinger, aislamiento multiempresa en dos capas, despliegue aislado, gestión de claves).

**Estado: Etapa 2 completa (endpoints de onboarding implementados y probados contra Postgres/Redis reales y una Meta Graph API simulada). En espera de aprobación explícita antes de la Etapa 3 (webhook + clasificación de mensajes).** Nada de esto está desplegado — ver `LOCAL TESTS PASSED / HOSTINGER VALIDATION PENDING / META COEXISTENCE TEST PENDING` al final de este README.

## Requisitos

- Node.js ≥ 20
- Docker + Docker Compose (para Postgres/Redis locales — **nunca** para producción)

## Puesta en marcha (desarrollo local)

```bash
cd backend
cp .env.example .env
# Genera valores propios para META_TOKEN_ENCRYPTION_KEY / META_ONBOARDING_SESSION_SECRET
# / META_INVITATION_TOKEN_SECRET / META_WHATSAPP_WEBHOOK_VERIFY_TOKEN / ADMIN_API_KEY
# con: openssl rand -hex 32

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
├── docs/
│   └── META_V4_COMPATIBILITY.md      ← verificación contra documentación oficial vigente de Meta (Embedded Signup v4, Coexistence)
├── src/
│   ├── config/env.ts                ← loaders de env vars, fail-closed
│   ├── db/client.ts                 ← Prisma conectado como app_runtime (no como dueño)
│   ├── redis/client.ts              ← cliente Redis singleton (consumo de tokens de invitación, colas futuras)
│   ├── crypto/
│   │   ├── tokenCipher.ts           ← AES-256-GCM para credenciales en reposo
│   │   └── rotateKey.ts             ← rotación de clave, tenant por tenant
│   ├── access/
│   │   ├── invitationToken.ts       ← token firmado (admin-only) para pre-autorizar qué tenant puede iniciar onboarding
│   │   ├── invitationTokenStore.ts  ← consumo de un solo uso respaldado por Redis (SET NX atómico)
│   │   └── sessionToken.ts          ← token firmado, autoemitido, que lleva {tenantId, nonce} durante una sesión de onboarding activa
│   ├── meta/graphClient.ts          ← cliente de Meta Graph API — sin ningún método /register o /deregister, por construcción
│   ├── tenancy/isolation.ts         ← TenantScope — Capa 1 (aplicación) del aislamiento + persistencia de onboarding completado
│   ├── onboarding/
│   │   ├── service.ts               ← orquesta start/session/complete
│   │   └── routes.ts                ← POST /onboarding/{start,session,complete}, con rate limiting en /start
│   ├── routes/health.ts
│   └── index.ts
├── tests/
│   ├── unit/                        ← cifrado, token de invitación, cliente Graph API simulado (36 casos)
│   └── integration/                 ← aislamiento por aplicación, Row-Level Security, concurrencia real de pool, rotación de clave, consumo de tokens, flujo de onboarding start→session→complete a nivel de servicio y HTTP (58 casos, Postgres+Redis reales)
```

## Lo que NO existe todavía (por diseño, en espera de aprobación)

- Webhook de Meta + clasificación de mensajes (cliente vs. eco de empleado vs. API) — Etapa 3.
- Adaptadores de Evolution API / Chatwoot / Typebot / n8n — Etapa 4.
- Cualquier despliegue real a Hostinger — `docker-compose.hostinger.yml` es una plantilla, nunca se ejecutó. `HOSTINGER_INTEGRATION_GUIDE.md` (se escribe al final) empieza con diagnóstico de solo lectura.
- Cualquier número de WhatsApp real conectado, y cualquier llamada real (no simulada) a Meta Graph API — ver "Estado real" abajo.
- Una herramienta administrativa con interfaz para emitir tokens de invitación — hoy es una función (`issueInvitationTokenAsAdmin`) que exige `ADMIN_API_KEY`, sin UI ni CLI todavía.

## Estado real — qué está probado y qué sigue pendiente de verificación

- **LOCAL TESTS PASSED**: 94/94 pruebas (36 unitarias + 58 de integración contra Postgres/Redis Dockerizados reales), `tsc --noEmit` limpio. Cubre aislamiento multiempresa en dos capas, concurrencia real del pool de conexiones, seguridad de tokens de invitación/sesión, y el flujo completo de onboarding con Meta Graph API simulada.
- **HOSTINGER VALIDATION PENDING**: nada de este backend se ha ejecutado contra el Hostinger real — ni el despliegue, ni una conexión desde el dominio público de Vercel, ni Postgres/Redis de producción.
- **META COEXISTENCE TEST PENDING**: ninguna llamada de este backend a Meta Graph API ha sido contra la API real. `getAuthorizingUserId` (`/me`), la forma exacta de la respuesta de `exchangeCodeForAccessToken`, y la respuesta de `subscribeAppToWaba` están verificadas solo contra la documentación oficial y respuestas simuladas — ver `docs/META_V4_COMPATIBILITY.md` para el detalle de qué se confirmó por lectura de documentación y qué sigue pendiente de una prueba real controlada (Fase C, con un número de prueba, nunca uno de cliente).

## Seguridad — reglas que este directorio ya sigue

- **Aislamiento multiempresa en dos capas independientes**, no solo una: `TenantScope` (aplicación) + Row-Level Security de Postgres (base de datos, rol `app_runtime` sin `BYPASSRLS`, fail-closed). Ver `ARCHITECTURE_DECISION.md`, Punto 2, para el detalle completo y las 21 pruebas que lo confirman.
- Nunca loguear tokens, códigos de autorización, ni el valor crudo de un secreto (`pino` con `redact` en `index.ts`, mismo principio que `server/meta/*` del repo Vercel).
- `META_TOKEN_ENCRYPTION_KEY` es independiente de `META_APP_SECRET` — nunca se deriva uno del otro. La clave y el backup de la base de datos nunca deben coexistir en el mismo respaldo (ver Punto 4).
- El servidor Express se conecta a Postgres como `app_runtime` (`RUNTIME_DATABASE_URL`) — nunca como el rol dueño de las tablas (`DATABASE_URL`, exclusivo de migraciones).
- `phoneNumberId` y `wabaId` son `@unique` a nivel de base de datos — un número o WABA no puede quedar asociado a dos tenants aunque la capa de aplicación tenga un bug (probado explícitamente).
- Ningún token de invitación, contraseña de rol, ni clave de cifrado se genera con un valor real en esta conversación ni queda en un archivo versionado — `.gitignore` excluye `.env`/`.env.*` con excepción solo de los `*.example`.
