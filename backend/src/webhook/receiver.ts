import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { encryptToken } from '../crypto/tokenCipher.js';
import { TenantScope } from '../tenancy/isolation.js';
import { classifyChange, type ClassifiedEvent } from './classify.js';
import { computeIdempotencyKey, hashSubEventPayload } from './dedupe.js';
import { incrementWebhookMetric } from './observability.js';
import { resolveWebhookRoute } from './routing.js';
import { webhookEnvelopeSchema, type WebhookChange, type WebhookEntry } from './schema.js';

const RETENTION_DAYS = 30;

export class WebhookPayloadError extends Error {
  constructor(public readonly code: 'INVALID_JSON' | 'INVALID_STRUCTURE') {
    super(code);
  }
}

export type ReceiveResult = { accepted: number; duplicates: number; quarantined: number };

function retentionDate(now: Date): Date {
  return new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function needsPhone(event: ClassifiedEvent): boolean {
  return ['CUSTOMER_INBOUND', 'BUSINESS_APP_ECHO', 'API_OUTBOUND_STATUS', 'CONTACT_SYNC'].includes(event.category);
}

async function quarantine(
  prisma: PrismaClient,
  key: Buffer,
  entry: Pick<WebhookEntry, 'id' | 'time'>,
  change: WebhookChange,
  reason: string,
  now: Date,
): Promise<void> {
  const source = JSON.stringify({ entryId: entry.id, entryTime: entry.time, change });
  await prisma.$executeRawUnsafe(
    'SELECT store_webhook_quarantine($1, $2, $3, $4, $5, $6::timestamptz::timestamp)',
    randomUUID(),
    entry.id,
    hashSubEventPayload(change),
    encryptToken(source, key),
    reason,
    retentionDate(now),
  );
  incrementWebhookMetric('quarantined');
}

export async function receiveWebhookPayload(params: {
  prisma: PrismaClient;
  rawBody: Buffer;
  payloadEncryptionKey: Buffer;
  now?: Date;
  countAsReceived?: boolean;
  persistQuarantine?: boolean;
}): Promise<ReceiveResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(params.rawBody.toString('utf8'));
  } catch {
    incrementWebhookMetric('validationErrors');
    throw new WebhookPayloadError('INVALID_JSON');
  }

  const parsed = webhookEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    incrementWebhookMetric('validationErrors');
    throw new WebhookPayloadError('INVALID_STRUCTURE');
  }

  if (params.countAsReceived !== false) incrementWebhookMetric('received');
  const now = params.now ?? new Date();
  const result: ReceiveResult = { accepted: 0, duplicates: 0, quarantined: 0 };

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const classified = classifyChange(entry, change);
      if (classified.length === 0) {
        if (params.persistQuarantine !== false) {
          await quarantine(params.prisma, params.payloadEncryptionKey, entry, change, 'EMPTY_OR_UNSUPPORTED_CHANGE', now);
        }
        result.quarantined += 1;
        continue;
      }

      for (let eventIndex = 0; eventIndex < classified.length; eventIndex += 1) {
        const event = classified[eventIndex]!;
        const resolution = await resolveWebhookRoute(params.prisma, entry.id, event.routing);
        if (!resolution.tenantId || (!resolution.phoneRowId && needsPhone(event)) || !['ROUTED', 'ROUTED_ADMIN'].includes(resolution.resultCode)) {
          if (params.persistQuarantine !== false) {
            await quarantine(params.prisma, params.payloadEncryptionKey, entry, change, resolution.resultCode, now);
          }
          result.quarantined += 1;
          continue;
        }

        const routingIdentity = event.routing.kind === 'unroutable' ? 'waba-admin' : `${event.routing.kind}:${event.routing.value}`;
        const idempotencyKey = computeIdempotencyKey(entry.id, routingIdentity, event.metaEventId);
        const encryptedPayload = encryptToken(
          JSON.stringify({ entryId: entry.id, entryTime: entry.time, field: change.field, value: change.value, eventIndex }),
          params.payloadEncryptionKey,
        );
        const scope = new TenantScope(params.prisma, resolution.tenantId);
        const stored = await scope.messageEvents().createIfNew({
          wabaId: entry.id,
          phoneNumberId: resolution.phoneRowId,
          metaEventId: event.metaEventId,
          idempotencyKey,
          direction: event.direction,
          origin: event.origin,
          waMessageId: event.waMessageId,
          contactWaId: event.contactWaId,
          messageType: event.messageType,
          statusValue: event.statusValue,
          hasMetaError: event.hasMetaError,
          rawPayloadHash: event.rawPayloadHash,
          encryptedPayload,
          eventCategory: event.category,
          eventTimestamp: event.eventTimestamp,
          retentionExpiresAt: retentionDate(now),
          eligibleForAutomation: false,
          processingState: 'PENDING',
          nextAttemptAt: now,
        });

        if (stored.isNew) {
          result.accepted += 1;
          incrementWebhookMetric('stored');
        } else {
          result.duplicates += 1;
          incrementWebhookMetric('duplicates');
        }
      }
    }
  }

  return result;
}
