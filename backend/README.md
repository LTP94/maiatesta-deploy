# maiatesta-whatsapp-backend

Backend de onboarding, persistencia multiempresa y webhooks para conectar números de WhatsApp Business de clientes vía **Coexistence**. Las integraciones con Evolution/Chatwoot/Typebot/n8n siguen reservadas para Etapa 4.

**Estado: Etapa 3 completa en pruebas locales (144/144).** Webhook, clasificación, inbox PostgreSQL, worker y recuperación están implementados. Nada fue desplegado ni probado con Meta real. Ver `STAGE3_ARCHITECTURE.md`, `STAGE3_TEST_REPORT.md` y las advertencias al final.

## Requisitos

- Node.js ≥ 20
- Docker + Docker Compose (para Postgres/Redis locales — **nunca** para producción)

## Puesta en marcha (desarrollo local)

```bash
cd backend
cp .env.example .env
# Genera valores propios para META_TOKEN_ENCRYPTION_KEY / META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY / META_ONBOARDING_SESSION_SECRET
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
npm run start:worker          # tras npm run build: worker durable independiente
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
│   ├── redis/client.ts              ← cliente Redis singleton (tokens de invitación; no cola del webhook)
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
│   ├── webhook/                    ← firma, parser, receiver, routing, worker y reproceso
│   ├── routes/health.ts
│   ├── app.ts                      ← monta el webhook raw antes del parser JSON
│   ├── worker-index.ts             ← proceso worker independiente
│   └── index.ts
├── tests/
│   ├── unit/                        ← 60 casos
│   ├── integration/                 ← 78 casos, PostgreSQL/Redis reales y E2E HTTP
│   └── security/                    ← 6 casos de firma, cifrado y fail-closed
```

## Lo que NO existe todavía (por diseño)

- Adaptadores de Evolution API / Chatwoot / Typebot / n8n — Etapa 4.
- Cualquier despliegue real a Hostinger — `docker-compose.hostinger.yml` es una plantilla, nunca se ejecutó. `HOSTINGER_INTEGRATION_GUIDE.md` (se escribe al final) empieza con diagnóstico de solo lectura.
- Cualquier número de WhatsApp real conectado, y cualquier llamada real (no simulada) a Meta Graph API — ver "Estado real" abajo.
- Una herramienta administrativa con interfaz para emitir tokens de invitación — hoy es una función (`issueInvitationTokenAsAdmin`) que exige `ADMIN_API_KEY`, sin UI ni CLI todavía.

## Estado real — qué está probado y qué sigue pendiente de verificación

- **STAGE 3 COMPLETE — LOCAL TESTS PASSED**: 144/144 pruebas (60 unitarias + 78 de integración + 6 de seguridad), cero omitidas y `tsc`/build limpios. PostgreSQL/Redis fueron contenedores locales aislados y Graph API fue simulada.
- **HOSTINGER VALIDATION PENDING**: nada de este backend se ha ejecutado contra el Hostinger real — ni el despliegue, ni una conexión desde el dominio público de Vercel, ni Postgres/Redis de producción.
- **META COEXISTENCE TEST PENDING**: ninguna llamada de este backend a Meta Graph API ha sido contra la API real. `getAuthorizingUserId` (`/me`), la forma exacta de la respuesta de `exchangeCodeForAccessToken`, y la respuesta de `subscribeAppToWaba` están verificadas solo contra la documentación oficial y respuestas simuladas — ver `docs/META_V4_COMPATIBILITY.md` para el detalle de qué se confirmó por lectura de documentación y qué sigue pendiente de una prueba real controlada (Fase C, con un número de prueba, nunca uno de cliente).

## Seguridad — reglas que este directorio ya sigue

- **Aislamiento multiempresa en dos capas independientes**, no solo una: `TenantScope` (aplicación) + Row-Level Security de Postgres (base de datos, rol `app_runtime` sin `BYPASSRLS`, fail-closed). Ver `ARCHITECTURE_DECISION.md`, Punto 2, para el detalle completo y las 21 pruebas que lo confirman.
- Nunca loguear tokens, códigos de autorización, ni el valor crudo de un secreto (`pino` con `redact` en `index.ts`, mismo principio que `server/meta/*` del repo Vercel).
- `META_TOKEN_ENCRYPTION_KEY` es independiente de `META_APP_SECRET` — nunca se deriva uno del otro. La clave y el backup de la base de datos nunca deben coexistir en el mismo respaldo (ver Punto 4).
- El servidor Express se conecta a Postgres como `app_runtime` (`RUNTIME_DATABASE_URL`) — nunca como el rol dueño de las tablas (`DATABASE_URL`, exclusivo de migraciones).
- `phoneNumberId` y `wabaId` son `@unique` a nivel de base de datos — un número o WABA no puede quedar asociado a dos tenants aunque la capa de aplicación tenga un bug (probado explícitamente).
- Ningún token de invitación, contraseña de rol, ni clave de cifrado se genera con un valor real en esta conversación ni queda en un archivo versionado — `.gitignore` excluye `.env`/`.env.*` con excepción solo de los `*.example`.
