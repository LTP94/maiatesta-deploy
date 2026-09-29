import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { decryptToken } from '../crypto/tokenCipher.js';
import { TenantScope } from '../tenancy/isolation.js';
import { classifyChange, computeEligibleForAutomation } from './classify.js';
import { incrementWebhookMetric } from './observability.js';
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

export class PermanentWebhookError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class WebhookWorker {
  readonly workerId: string;
  private readonly startedAt = new Date();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly payloadEncryptionKey: Buffer,
    private readonly processor: EventProcessor = async () => undefined,
    workerId = `worker-${randomUUID()}`,
    private readonly processorTimeoutMs = 10_000,
  ) {
    this.workerId = workerId;
  }

  async claim(limit = 10, leaseSeconds = 30): Promise<ClaimedEvent[]> {
    return this.prisma.$queryRawUnsafe<ClaimedEvent[]>(
      'SELECT * FROM claim_webhook_events($1, $2::integer, $3::integer)',
      this.workerId,
      limit,
      leaseSeconds,
    );
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
        update: { status: 'RUNNING', lastSeenAt: new Date(), lastErrorCode: null },
      });
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
        data: { lastSeenAt: new Date(), processedCount: { increment: claims.length } },
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
