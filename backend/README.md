# maiatesta-whatsapp-backend

Backend de onboarding, persistencia multiempresa y (en etapas futuras) webhook + integraciones para conectar números de WhatsApp Business de clientes vía **Coexistence**. Ver `ARCHITECTURE_DECISION.md` para el porqué de este servicio separado del repo principal (Vercel).

**Estado: Etapa 1 de 4 — esquema de datos + persistencia + aislamiento multiempresa.** Sin endpoints de onboarding/webhook todavía (Etapas 2-3, pendientes de aprobación). Ver `docs/STAGE_1_REPORT.md` para el detalle de lo construido y probado en esta etapa.

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
npx prisma migrate dev        # aplica el esquema
npm run dev                   # servidor en :4000 con recarga en caliente
```

```bash
curl http://localhost:4000/health
# {"ok":true,"service":"maiatesta-whatsapp-backend","database":"connected",...}
```

## Pruebas

Las pruebas de integración corren contra una base de datos **separada** de la de desarrollo (puertos 55563/55564, `docker-compose.test.yml`) — nunca comparten datos ni contenedor.

```bash
npm run docker:test:up
DATABASE_URL="postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public" \
  npx prisma migrate deploy

TEST_DATABASE_URL="postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public" \
  npm test

npm run docker:test:down      # limpia los contenedores de prueba al terminar
```

## Estructura

```
backend/
├── ARCHITECTURE_DECISION.md   ← por qué Alternativa B, con evidencia
├── prisma/schema.prisma       ← modelo de datos multiempresa
├── src/
│   ├── config/env.ts          ← loaders de env vars, fail-closed
│   ├── db/client.ts           ← singleton de Prisma
│   ├── crypto/tokenCipher.ts  ← AES-256-GCM para credenciales en reposo
│   ├── tenancy/isolation.ts   ← TenantScope — aislamiento estructural, no opcional
│   ├── routes/health.ts
│   └── index.ts
├── tests/
│   ├── unit/                  ← cifrado (10 casos)
│   └── integration/           ← aislamiento multiempresa (9 casos, Postgres real)
├── docker-compose.yml         ← Postgres+Redis de desarrollo
└── docker-compose.test.yml    ← Postgres+Redis de pruebas (aislados)
```

## Lo que NO existe todavía (por diseño, en espera de aprobación)

- Endpoints de onboarding (`/onboarding/start`, `/session`, `/complete`) — Etapa 2.
- Webhook de Meta + clasificación de mensajes (cliente vs. eco de empleado vs. API) — Etapa 3.
- Adaptadores de Evolution API / Chatwoot / Typebot / n8n — Etapa 4.
- Cualquier despliegue a Hostinger — ver `HOSTINGER_INTEGRATION_GUIDE.md` (se escribe al final, con diagnóstico de solo lectura como primer paso).

## Seguridad — reglas que este directorio ya sigue y que las próximas etapas deben mantener

- Nunca loguear tokens, códigos de autorización, ni el valor crudo de un secreto (`pino` con `redact` en `index.ts`, mismo principio que `server/meta/*` del repo Vercel).
- `META_TOKEN_ENCRYPTION_KEY` es independiente de `META_APP_SECRET` — nunca se deriva uno del otro.
- Todo acceso a datos de un tenant pasa por `TenantScope` (`src/tenancy/isolation.ts`) — no hay una ruta "rápida" que se salte el filtro.
- `phoneNumberId` es `@unique` a nivel de base de datos — un número no puede quedar asociado a dos tenants aunque la capa de aplicación tenga un bug (probado explícitamente).
