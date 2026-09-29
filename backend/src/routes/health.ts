import { Router } from 'express';
import { getPrismaClient } from '../db/client.js';
import { getWebhookMetrics } from '../webhook/observability.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  let dbOk = false;
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    service: 'maiatesta-whatsapp-backend',
    database: dbOk ? 'connected' : 'unreachable',
    webhook: getWebhookMetrics(),
    timestamp: new Date().toISOString(),
  });
});
