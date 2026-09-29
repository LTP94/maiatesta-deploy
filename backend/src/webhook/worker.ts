import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { decryptToken } from '../crypto/tokenCipher.js';
import { TenantScope } from '../tenancy/isolation.js';
import { classifyChange, computeEligibleForAutomation } from './classify.js';
import { incrementWebhookMetric } from './observability.js';
import { receiveWebhookPayload } from './receiver.js';
import { purgeExpiredWebhookData, type RetentionPurgeResult } from './retention.js';
import { webhookEnvelopeSchema } from './schema.js';

export const EVENT_CONTRACT_VERSION = 1;
const MAX_ATTEMPTS = 5;

export type NormalizedWebhookEvent = {
  contractVersion: 1;
  internalEventId: string;
  idempotencyKey: string;
  tenantId: string;
  wabaId: string;
  phoneNumberId: string | null;
  contactWaId: string | null;
  externalMessageId: string | null;
  message: { type: string | null };
  occurredAt: string | null;
  direction: string;
  origin: string;
  classification: string;
  automationEligible: boolean;
  processingState: 'PROCESSED';
};

export type EventProcessor = (event: NormalizedWebhookEvent) => Promise<void>;

type ClaimedEvent = { eventId: string; tenantId: string };
type ClaimedQuarantine = { quarantineId: string; encryptedPayload: string; recoveryAttempts: number };

export class PermanentWebhookError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class WebhookWorker {
  readonly workerId: string;
  private readonly startedAt = new Date();
  private nextRetentionRunAt = 0;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly payloadEncryptionKey: Buffer,
    private readonly processor: EventProcessor = async () => undefined,
    workerId = `worker-${randomUUID()}`,
    private readonly processorTimeoutMs = 10_000,
    private readonly retentionIntervalMs = 900_000,
    private readonly retentionBatchSize = 500,
  ) {
    this.workerId = workerId;
  }

  async runRetentionIfDue(now = Date.now()): Promise<RetentionPurgeResult> {
    if (now < this.nextRetentionRunAt) return { messageEventsDeleted: 0, quarantineEventsDeleted: 0 };

    try {
      const totals: RetentionPurgeResult = { messageEventsDeleted: 0, quarantineEventsDeleted: 0 };
      for (let batch = 0; batch < 10; batch += 1) {
        const result = await purgeExpiredWebhookData(this.prisma, this.retentionBatchSize);
        totals.messageEventsDeleted += result.messageEventsDeleted;
        totals.quarantineEventsDeleted += result.quarantineEventsDeleted;
        if (result.messageEventsDeleted < this.retentionBatchSize && result.quarantineEventsDeleted < this.retentionBatchSize) break;
      }
      this.nextRetentionRunAt = now + this.retentionIntervalMs;
      return totals;
    } catch (error) {
      // Un fallo de housekeeping no debe bloquear webhooks ni provocar un
      // restart loop. Se reintenta como máximo una vez por minuto y se deja
      // visible en el heartbeat para alertamiento operativo.
      this.nextRetentionRunAt = now + Math.min(this.retentionIntervalMs, 60_000);
      throw error;
    }
  }

  async claim(limit = 10, leaseSeconds = 30): Promise<ClaimedEvent[]> {
    return this.prisma.$queryRawUnsafe<ClaimedEvent[]>(
      'SELECT * FROM claim_webhook_events($1, $2::integer, $3::integer)',
      this.workerId,
      limit,
      leaseSeconds,
    );
  }

  async claimRecoverableQuarantine(limit = 10, leaseSeconds = 30): Promise<ClaimedQuarantine[]> {
    return this.prisma.$queryRawUnsafe<ClaimedQuarantine[]>(
      'SELECT * FROM claim_recoverable_webhook_quarantine($1, $2::integer, $3::integer)',
      this.workerId,
      limit,
      leaseSeconds,
    );
  }

  private async finishQuarantineRecovery(quarantineId: string, recoveredCount: number): Promise<void> {
    await this.prisma.$queryRawUnsafe(
      'SELECT complete_webhook_quarantine_recovery($1, $2, $3::integer)',
      quarantineId,
      this.workerId,
      recoveredCount,
    );
  }

  private async retryQuarantineRecovery(claim: ClaimedQuarantine, errorCode: string): Promise<void> {
    const delayMs = Math.min(60_000, 1000 * 2 ** Math.max(0, claim.recoveryAttempts - 1));
    await this.prisma.$queryRawUnsafe(
      'SELECT retry_webhook_quarantine_recovery($1, $2, $3, $4::timestamptz::timestamp)',
      claim.quarantineId,
      this.workerId,
      errorCode,
      new Date(Date.now() + delayMs),
    );
  }

  private async deferQuarantineRecovery(quarantineId: string, errorCode: string): Promise<void> {
    await this.prisma.$queryRawUnsafe(
      'SELECT defer_webhook_quarantine_recovery($1, $2, $3, $4::timestamptz::timestamp)',
      quarantineId,
      this.workerId,
      errorCode,
      new Date(Date.now() + 30_000),
    );
  }

  async recoverQuarantine(limit = 10): Promise<number> {
    const claims = await this.claimRecoverableQuarantine(limit);
    await Promise.all(
      claims.map(async (claim) => {
        try {
          const source = JSON.parse(decryptToken(claim.encryptedPayload, this.payloadEncryptionKey)) as {
            entryId?: unknown;
            entryTime?: unknown;
            change?: unknown;
          };
          if (typeof source.entryId !== 'string' || !source.change || typeof source.change !== 'object') {
            await this.retryQuarantineRecovery(claim, 'RECOVERY_PAYLOAD_INVALID');
            return;
          }
          const rawBody = Buffer.from(
            JSON.stringify({
              object: 'whatsapp_business_account',
              entry: [{ id: source.entryId, time: source.entryTime, changes: [source.change] }],
            }),
          );
          const result = await receiveWebhookPayload({
            prisma: this.prisma,
            rawBody,
            payloadEncryptionKey: this.payloadEncryptionKey,
            countAsReceived: false,
            persistQuarantine: false,
          });
          const recoveredCount = result.accepted + result.duplicates;
          if (result.quarantined === 0 && recoveredCount > 0) {
            await this.finishQuarantineRecovery(claim.quarantineId, recoveredCount);
          } else {
            await this.deferQuarantineRecovery(claim.quarantineId, 'ROUTE_NOT_READY');
          }
        } catch {
          await this.retryQuarantineRecovery(claim, 'RECOVERY_PROCESSING_FAILED');
        }
      }),
    );
    return claims.length;
  }

  async processClaim(claim: ClaimedEvent): Promise<void> {
    const scope = new TenantScope(this.prisma, claim.tenantId);
    const event = await scope.messageEvents().findById(claim.eventId);
    if (!event || event.processingState !== 'PROCESSING' || event.leaseOwner !== this.workerId) return;

    try {
      let source: { entryId: string; entryTime?: string | number; field: string; value: unknown; eventIndex: number };
      try {
        source = JSON.parse(decryptToken(event.encryptedPayload, this.payloadEncryptionKey)) as typeof source;
      } catch {
        throw new PermanentWebhookError('PAYLOAD_DECRYPTION_FAILED', 'Encrypted webhook payload could not be authenticated.');
      }

      const envelope = webhookEnvelopeSchema.safeParse({
        object: 'whatsapp_business_account',
        entry: [{ id: source.entryId, time: source.entryTime, changes: [{ field: source.field, value: source.value }] }],
      });
      if (!envelope.success) throw new PermanentWebhookError('PAYLOAD_CONTRACT_INVALID', 'Stored webhook payload failed contract validation.');
      const current = classifyChange(envelope.data.entry[0]!, envelope.data.entry[0]!.changes[0]!)[source.eventIndex];
      if (!current || current.metaEventId !== event.metaEventId || current.category !== event.eventCategory) {
        throw new PermanentWebhookError('CLASSIFICATION_MISMATCH', 'Stored classification no longer matches its source payload.');
      }

      let paused = false;
      if (event.phoneNumberId && event.contactWaId && current.category === 'CUSTOMER_INBOUND') {
        paused = Boolean((await scope.conversationAutomationState().get(event.phoneNumberId, event.contactWaId))?.automationPaused);
      }
      const automationEligible = computeEligibleForAutomation(current, paused);
      const normalized: NormalizedWebhookEvent = {
        contractVersion: EVENT_CONTRACT_VERSION,
        internalEventId: event.id,
        idempotencyKey: event.idempotencyKey,
        tenantId: event.tenantId,
        wabaId: event.wabaId,
        phoneNumberId: event.phoneNumberId,
        contactWaId: event.contactWaId,
        externalMessageId: event.waMessageId,
        message: { type: event.messageType },
        occurredAt: event.eventTimestamp?.toISOString() ?? null,
        direction: event.direction,
        origin: event.origin,
        classification: event.eventCategory,
        automationEligible,
        processingState: 'PROCESSED',
      };

      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          this.processor(normalized),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('Event processor timed out.')), this.processorTimeoutMs);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      await scope.messageEvents().markProcessed(event.id, automationEligible, normalized);
      incrementWebhookMetric('processed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error.';
      if (error instanceof PermanentWebhookError) {
        await scope.messageEvents().quarantine(event.id, error.code, message);
        incrementWebhookMetric('quarantined');
      } else if (event.processingAttempts >= MAX_ATTEMPTS) {
        await scope.messageEvents().markManualIntervention(event.id, 'RETRIES_EXHAUSTED', message);
        incrementWebhookMetric('deadLetters');
      } else {
        const delayMs = Math.min(60_000, 1000 * 2 ** Math.max(0, event.processingAttempts - 1));
        await scope.messageEvents().scheduleRetry(event.id, 'PROCESSOR_TEMPORARY_FAILURE', message, new Date(Date.now() + delayMs));
        incrementWebhookMetric('retries');
      }
    }
  }

  async runOnce(limit = 10): Promise<number> {
    try {
      await this.prisma.webhookWorkerHeartbeat.upsert({
        where: { workerId: this.workerId },
        create: { workerId: this.workerId, status: 'RUNNING', startedAt: this.startedAt, lastSeenAt: new Date() },
        update: { status: 'RUNNING', lastSeenAt: new Date() },
      });
      const retentionWasDue = Date.now() >= this.nextRetentionRunAt;
      let retentionSucceeded = false;
      try {
        await this.runRetentionIfDue();
        retentionSucceeded = retentionWasDue;
      } catch {
        await this.prisma.webhookWorkerHeartbeat.update({
          where: { workerId: this.workerId },
          data: { lastSeenAt: new Date(), lastErrorCode: 'RETENTION_CLEANUP_FAILED' },
        });
      }
      await this.recoverQuarantine(limit);
      const claims: ClaimedEvent[] = [];
      // Cada claim toma como máximo uno por tenant. Repetir rondas llena el
      // lote sin sacrificar equidad cuando hay varios tenants activos.
      while (claims.length < limit) {
        const round = await this.claim(limit - claims.length);
        if (round.length === 0) break;
        claims.push(...round);
      }
      await Promise.all(claims.map((claim) => this.processClaim(claim)));
      await this.prisma.webhookWorkerHeartbeat.update({
        where: { workerId: this.workerId },
        data: {
          lastSeenAt: new Date(),
          processedCount: { increment: claims.length },
          ...(retentionSucceeded ? { lastErrorCode: null } : {}),
        },
      });
      return claims.length;
    } catch (error) {
      await this.prisma.webhookWorkerHeartbeat
        .upsert({
          where: { workerId: this.workerId },
          create: {
            workerId: this.workerId,
            status: 'DEGRADED',
            startedAt: this.startedAt,
            lastSeenAt: new Date(),
            lastErrorCode: 'WORKER_LOOP_FAILURE',
          },
          update: { status: 'DEGRADED', lastSeenAt: new Date(), lastErrorCode: 'WORKER_LOOP_FAILURE' },
        })
        .catch(() => undefined);
      throw error;
    }
  }
}
