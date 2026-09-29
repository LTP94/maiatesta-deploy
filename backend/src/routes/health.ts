import { Router } from 'express';
import { getPrismaClient } from '../db/client.js';
import { getWebhookMetrics } from '../webhook/observability.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  let dbOk = false;
  let worker: { status: string; lastSeenAt: Date } | null = null;
  let queue: Record<string, unknown> | null = null;
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    worker = await prisma.webhookWorkerHeartbeat.findFirst({
      select: { status: true, lastSeenAt: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    const metrics = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT * FROM webhook_queue_metrics()');
    queue = metrics[0]
      ? Object.fromEntries(Object.entries(metrics[0]).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]))
      : null;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    service: 'maiatesta-whatsapp-backend',
    database: dbOk ? 'connected' : 'unreachable',
    webhook: getWebhookMetrics(),
    worker: worker
      ? { status: Date.now() - worker.lastSeenAt.getTime() > 30_000 ? 'STALE' : worker.status, lastSeenAt: worker.lastSeenAt.toISOString() }
      : { status: 'NOT_STARTED' },
    queue,
    timestamp: new Date().toISOString(),
  });
});
