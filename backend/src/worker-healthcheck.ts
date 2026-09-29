import { getPrismaClient } from './db/client.js';

const workerId = process.env.WORKER_ID;
if (!workerId) throw new Error('WORKER_ID is not configured.');

const prisma = getPrismaClient();
try {
  const heartbeat = await prisma.webhookWorkerHeartbeat.findUnique({
    where: { workerId },
    select: { status: true, lastSeenAt: true, lastErrorCode: true },
  });
  if (
    !heartbeat ||
    heartbeat.status !== 'RUNNING' ||
    heartbeat.lastErrorCode !== null ||
    Date.now() - heartbeat.lastSeenAt.getTime() > 30_000
  ) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
