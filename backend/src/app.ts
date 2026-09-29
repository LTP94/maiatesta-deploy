import express, { type Express } from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import type { PrismaClient } from '@prisma/client';
import { getAllowedOrigins, getMetaAppSecret, getMetaWebhookVerifyToken, getWebhookPayloadEncryptionKey } from './config/env.js';
import { getPrismaClient } from './db/client.js';
import { createOnboardingRouter } from './onboarding/routes.js';
import { healthRouter } from './routes/health.js';
import { createWhatsappWebhookRouter, type WebhookRouterDeps } from './webhook/routes.js';

export type AppDeps = Partial<WebhookRouterDeps> & { prisma?: PrismaClient };

export function createApp(overrides: AppDeps = {}): Express {
  const app = express();
  const prisma = overrides.prisma ?? getPrismaClient();

  app.use(
    pinoHttp({
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-hub-signature-256', 'req.body'],
    }),
  );
  app.use(cors({ origin: getAllowedOrigins(), credentials: false }));
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
  app.use(createOnboardingRouter());
  return app;
}
