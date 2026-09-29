import express, { type Express } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import type { PrismaClient } from '@prisma/client';
import { getAllowedOrigins, getMetaAppSecret, getMetaWebhookVerifyToken, getWebhookPayloadEncryptionKey } from './config/env.js';
import { getPrismaClient } from './db/client.js';
import { createOnboardingRouter } from './onboarding/routes.js';
import type { OnboardingDeps } from './onboarding/service.js';
import { healthRouter } from './routes/health.js';
import { createWhatsappWebhookRouter, type WebhookRouterDeps } from './webhook/routes.js';

export type AppDeps = Partial<WebhookRouterDeps> & {
  prisma?: PrismaClient;
  onboardingDeps?: OnboardingDeps;
};

export function createApp(overrides: AppDeps = {}): Express {
  const app = express();
  // El contenedor solo es alcanzable a través del Nginx Proxy Manager de la
  // red ingress dedicada; permite que rate-limit use la IP original.
  app.set('trust proxy', 1);
  const prisma = overrides.prisma ?? getPrismaClient();

  app.use(
    pinoHttp({
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-hub-signature-256', 'req.body'],
    }),
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
