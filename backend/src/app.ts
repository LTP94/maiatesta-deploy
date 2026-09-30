import type { Writable } from 'node:stream';
import express, { type Express } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import type { PrismaClient } from '@prisma/client';
import { getAllowedOrigins, getMetaAppSecret, getMetaWebhookVerifyToken, getWebhookPayloadEncryptionKey } from './config/env.js';
import { getPrismaClient } from './db/client.js';
import { createOnboardingRouter } from './onboarding/routes.js';
import type { OnboardingDeps } from './onboarding/service.js';
import { serializeRequestForLog } from './logging/requestSerializer.js';
import { healthRouter } from './routes/health.js';
import { createWhatsappWebhookRouter, type WebhookRouterDeps } from './webhook/routes.js';

export type AppDeps = Partial<WebhookRouterDeps> & {
  prisma?: PrismaClient;
  onboardingDeps?: OnboardingDeps;
  // Solo para pruebas — permite capturar el stream real de Pino en vez de
  // stdout, para inspeccionar exactamente qué queda serializado en el log
  // (ver tests/security/http-log-redaction.test.ts). Nunca se usa en
  // runtime real: sin override, pino-http escribe a stdout como siempre.
  logStream?: Writable;
};

export function createApp(overrides: AppDeps = {}): Express {
  const app = express();
  // El contenedor solo es alcanzable a través del Nginx Proxy Manager de la
  // red ingress dedicada; permite que rate-limit use la IP original.
  app.set('trust proxy', 1);
  const prisma = overrides.prisma ?? getPrismaClient();

  app.use(
    pinoHttp(
      {
        // Auditoría de registros (2026-09-29, hallazgo V1): el serializer por
        // defecto de pino-http copia `req.originalUrl` (URL completa, con
        // query string) y `req.query` (objeto parseado) sin excepción — así
        // es como `hub.verify_token` del webhook de Meta terminaba en texto
        // claro en el log, incluso en intentos de verificación fallidos. La
        // corrección es un serializer de LISTA EXPLÍCITA DE CAMPOS
        // PERMITIDOS (`serializeRequestForLog`, ver src/logging/requestSerializer.ts):
        // nunca incluye la query string en ningún campo, y solo copia
        // cabeceras operativas ya enumeradas — Authorization/Cookie/
        // X-Hub-Signature-256 quedan fuera por construcción, no por
        // redacción.
        //
        // `redact` se conserva como red de seguridad adicional (defensa en
        // profundidad, mismo principio que TenantScope + RLS en el resto del
        // proyecto) — con el allow-list de arriba, estas rutas normalmente
        // no encuentran nada que redactar, pero protegen igual si alguien
        // en el futuro cambia el serializer sin replicar la misma lista.
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-hub-signature-256"]'],
        serializers: {
          req: serializeRequestForLog,
        },
      },
      overrides.logStream,
    ),
  );
  app.use(
    createWhatsappWebhookRouter({
      prisma,
      appSecret: overrides.appSecret ?? getMetaAppSecret(),
      verifyToken: overrides.verifyToken ?? getMetaWebhookVerifyToken(),
      payloadEncryptionKey: overrides.payloadEncryptionKey ?? getWebhookPayloadEncryptionKey(),
    }),
  );

  // El webhook raw se registra arriba; el resto del sitio recibe JSON normal.
  app.use(express.json({ limit: '256kb' }));
  app.use(healthRouter);
  // Only browser-facing onboarding routes need CORS. Webhooks are called by
  // Meta server-to-server and health is operational; adding CORS there would
  // enlarge the browser-visible surface without a consumer.
  app.use(
    '/onboarding',
    cors({
      origin: getAllowedOrigins(),
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
      maxAge: 600,
    }),
  );
  app.use(createOnboardingRouter(overrides.onboardingDeps));
  return app;
}
