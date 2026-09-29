import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { encryptToken } from '../../src/crypto/tokenCipher.js';
import { purgeExpiredWebhookData } from '../../src/webhook/retention.js';
import { WebhookWorker } from '../../src/webhook/worker.js';

const OWNER_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';
const RUNTIME_URL =
  process.env.TEST_RUNTIME_DATABASE_URL ??
  'postgresql://app_runtime:stage3_runtime_test_only@localhost:55563/maiatesta_whatsapp_test?schema=public';
const PAYLOAD_KEY = Buffer.from('d'.repeat(64), 'hex');

const owner = new PrismaClient({ datasources: { db: { url: OWNER_URL } } });
const runtime = new PrismaClient({ datasources: { db: { url: RUNTIME_URL } } });
let tenantId: string;

async function createMessageEvent(params: { expired: boolean; processing?: boolean }) {
  const id = randomUUID();
  return owner.messageEvent.create({
    data: {
      id,
      tenantId,
      wabaId: `waba-retention-${id}`,
      metaEventId: `meta-retention-${id}`,
      idempotencyKey: `retention-${id}`,
      direction: 'INBOUND',
      origin: 'CUSTOMER',
      rawPayloadHash: id.replaceAll('-', ''),
      encryptedPayload: encryptToken(JSON.stringify({ id }), PAYLOAD_KEY),
      eventCategory: 'CUSTOMER_INBOUND',
      processingState: params.processing ? 'PROCESSING' : 'PROCESSED',
      leaseOwner: params.processing ? 'active-worker' : null,
      leaseExpiresAt: params.processing ? new Date(Date.now() + 60_000) : null,
      retentionExpiresAt: new Date(Date.now() + (params.expired ? -60_000 : 60_000)),
    },
  });
}

async function createQuarantine(params: {
  expired: boolean;
  recoveryState?: string;
  reasonCode?: string;
  wabaId?: string;
  processing?: boolean;
}) {
  const id = randomUUID();
  return owner.webhookQuarantineEvent.create({
    data: {
      id,
      wabaId: params.wabaId ?? `unknown-waba-${id}`,
      rawPayloadHash: id.replaceAll('-', ''),
      encryptedPayload: encryptToken(JSON.stringify({ entryId: params.wabaId ?? 'unknown', change: { field: 'messages', value: {} } }), PAYLOAD_KEY),
      reasonCode: params.reasonCode ?? 'UNKNOWN_WABA',
      recoveryState: params.processing ? 'PROCESSING' : (params.recoveryState ?? 'PENDING'),
      recoveryLeaseOwner: params.processing ? 'active-worker' : null,
      recoveryLeaseUntil: params.processing ? new Date(Date.now() + 60_000) : null,
      retentionExpiresAt: new Date(Date.now() + (params.expired ? -60_000 : 60_000)),
    },
  });
}

beforeAll(async () => {
  await owner.$connect();
  await runtime.$connect();
});

afterAll(async () => {
  await runtime.$disconnect();
  await owner.$disconnect();
});

beforeEach(async () => {
  await owner.webhookWorkerHeartbeat.deleteMany();
  await owner.webhookQuarantineEvent.deleteMany();
  await owner.messageEvent.deleteMany();
  await owner.tenant.deleteMany();
  tenantId = (await owner.tenant.create({ data: { name: 'Retention tenant', slug: `retention-${randomUUID()}` } })).id;
});

describe('retención automática de webhooks', () => {
  it('elimina eventos expirados y cuarentenas irrecuperables, conservando los no expirados', async () => {
    const expiredEvent = await createMessageEvent({ expired: true });
    const currentEvent = await createMessageEvent({ expired: false });
    const expiredQuarantine = await createQuarantine({ expired: true, recoveryState: 'MANUAL_INTERVENTION' });
    const currentQuarantine = await createQuarantine({ expired: false, recoveryState: 'MANUAL_INTERVENTION' });

    await expect(purgeExpiredWebhookData(runtime, 100)).resolves.toEqual({
      messageEventsDeleted: 1,
      quarantineEventsDeleted: 1,
    });
    expect(await owner.messageEvent.findMany({ select: { id: true } })).toEqual([{ id: currentEvent.id }]);
    expect(await owner.webhookQuarantineEvent.findMany({ select: { id: true } })).toEqual([{ id: currentQuarantine.id }]);
    expect(await owner.messageEvent.findUnique({ where: { id: expiredEvent.id } })).toBeNull();
    expect(await owner.webhookQuarantineEvent.findUnique({ where: { id: expiredQuarantine.id } })).toBeNull();
  });

  it('protege leases activos y elimina leases vencidos o ausentes', async () => {
    const event = await createMessageEvent({ expired: true, processing: true });
    const quarantine = await createQuarantine({ expired: true, processing: true });
    const abandonedEvent = await createMessageEvent({ expired: true, processing: true });
    const abandonedQuarantine = await createQuarantine({ expired: true, processing: true });
    await owner.messageEvent.update({ where: { id: abandonedEvent.id }, data: { leaseExpiresAt: null } });
    await owner.webhookQuarantineEvent.update({ where: { id: abandonedQuarantine.id }, data: { recoveryLeaseUntil: null } });

    await expect(purgeExpiredWebhookData(runtime, 100)).resolves.toEqual({
      messageEventsDeleted: 1,
      quarantineEventsDeleted: 1,
    });
    expect(await owner.messageEvent.findUnique({ where: { id: event.id } })).not.toBeNull();
    expect(await owner.webhookQuarantineEvent.findUnique({ where: { id: quarantine.id } })).not.toBeNull();

    await owner.messageEvent.update({ where: { id: event.id }, data: { leaseExpiresAt: new Date(0) } });
    await owner.webhookQuarantineEvent.update({ where: { id: quarantine.id }, data: { recoveryLeaseUntil: new Date(0) } });
    await expect(purgeExpiredWebhookData(runtime, 100)).resolves.toEqual({
      messageEventsDeleted: 1,
      quarantineEventsDeleted: 1,
    });
  });

  it('una WABA desconocida no consume reintentos y el worker la elimina al expirar', async () => {
    const quarantine = await createQuarantine({ expired: false, wabaId: 'waba-never-authorized', reasonCode: 'UNKNOWN_WABA' });
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'retention-worker', 10_000, 60_000, 100);

    expect(await worker.recoverQuarantine()).toBe(0);
    expect(await owner.webhookQuarantineEvent.findUniqueOrThrow({ where: { id: quarantine.id } })).toMatchObject({
      recoveryState: 'PENDING',
      recoveryAttempts: 0,
    });

    await owner.webhookQuarantineEvent.update({ where: { id: quarantine.id }, data: { retentionExpiresAt: new Date(0) } });
    await expect(worker.runOnce()).resolves.toBe(0);
    expect(await owner.webhookQuarantineEvent.count()).toBe(0);
  });
});
