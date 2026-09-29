import type { PrismaClient } from '@prisma/client';

export type RetentionPurgeResult = {
  messageEventsDeleted: number;
  quarantineEventsDeleted: number;
};

export async function purgeExpiredWebhookData(prisma: PrismaClient, batchSize = 500): Promise<RetentionPurgeResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
    throw new Error('Retention batch size must be an integer between 1 and 5000.');
  }
  const rows = await prisma.$queryRawUnsafe<RetentionPurgeResult[]>(
    'SELECT * FROM purge_expired_webhook_data($1::integer)',
    batchSize,
  );
  return rows[0] ?? { messageEventsDeleted: 0, quarantineEventsDeleted: 0 };
}
