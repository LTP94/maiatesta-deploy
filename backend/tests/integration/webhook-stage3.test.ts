import { createHmac, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createWhatsappWebhookRouter } from '../../src/webhook/routes.js';
import { WebhookWorker } from '../../src/webhook/worker.js';
import { TenantScope } from '../../src/tenancy/isolation.js';
import { encryptToken } from '../../src/crypto/tokenCipher.js';
import { MetaGraphClient } from '../../src/meta/graphClient.js';
import { ensureWabaSubscription } from '../../src/meta/wabaSubscription.js';
import { reprocessWebhookEvent } from '../../src/webhook/reprocess.js';

const OWNER_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';
const RUNTIME_URL =
  process.env.TEST_RUNTIME_DATABASE_URL ??
  'postgresql://app_runtime:stage3_runtime_test_only@localhost:55563/maiatesta_whatsapp_test?schema=public';
const APP_SECRET = 'stage3-test-app-secret';
const VERIFY_TOKEN = 'stage3-test-verify-token';
const PAYLOAD_KEY = Buffer.from('c'.repeat(64), 'hex');

const owner = new PrismaClient({ datasources: { db: { url: OWNER_URL } } });
const runtime = new PrismaClient({ datasources: { db: { url: RUNTIME_URL } } });
let server: ReturnType<ReturnType<typeof express>['listen']>;
let baseUrl = '';

type Fixture = { tenantId: string; wabaId: string; phoneRowId: string; phoneExternalId: string };
let tenantA: Fixture;
let tenantB: Fixture;

function signature(body: Buffer): string {
  return `sha256=${createHmac('sha256', APP_SECRET).update(body).digest('hex')}`;
}

async function send(payload: unknown, signatureOverride?: string) {
  const raw = Buffer.from(JSON.stringify(payload));
  return fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': signatureOverride ?? signature(raw) },
    body: raw,
  });
}

function messagePayload(fixture: Fixture, id = 'wamid.inbound.1', body = 'synthetic hello') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: fixture.wabaId,
        time: 1_799_999_999,
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550000000', phone_number_id: fixture.phoneExternalId },
              contacts: [{ wa_id: '15551112222' }],
              messages: [{ from: '15551112222', id, timestamp: '1799999999', type: 'text', text: { body } }],
            },
          },
        ],
      },
    ],
  };
}

function echoPayload(fixture: Fixture, id = 'wamid.echo.1') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: fixture.wabaId,
        changes: [
          {
            field: 'smb_message_echoes',
            value: {
              metadata: { phone_number_id: fixture.phoneExternalId },
              message_echoes: [{ from: '15550000000', to: '15551112222', id, timestamp: '1799999999', type: 'text' }],
            },
          },
        ],
      },
    ],
  };
}

function transitionWindowPayload(fixture: Fixture) {
  const metadata = { display_phone_number: '15550000000', phone_number_id: fixture.phoneExternalId };
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: fixture.wabaId,
        time: 1_799_999_999,
        changes: [
          {
            field: 'messages',
            value: {
              metadata,
              messages: [{ from: '15551112222', id: 'wamid.transition.inbound', timestamp: '1799999999', type: 'text', text: { body: 'during onboarding' } }],
            },
          },
          {
            field: 'smb_message_echoes',
            value: {
              metadata,
              message_echoes: [{ from: '15550000000', to: '15551112222', id: 'wamid.transition.echo', timestamp: '1799999999', type: 'text' }],
            },
          },
          {
            field: 'smb_app_state_sync',
            value: {
              metadata,
              state_sync: [{ type: 'contact', action: 'add', contact: { phone_number: '15551112222' }, metadata: { timestamp: '1799999999' } }],
            },
          },
          {
            field: 'history',
            value: {
              metadata,
              history: [{ threads: [{ id: '15551112222', messages: [{ from: '15551112222', id: 'wamid.transition.history', timestamp: '1799999998', type: 'text' }] }] }],
            },
          },
        ],
      },
    ],
  };
}

async function seedTenant(label: string): Promise<Fixture> {
  const suffix = randomBytes(5).toString('hex');
  const tenant = await owner.tenant.create({ data: { name: `Tenant ${label}`, slug: `tenant-${label}-${suffix}` } });
  const session = await owner.onboardingSession.create({
    data: { tenantId: tenant.id, adminUserId: `admin-${suffix}`, nonce: `nonce-${suffix}`, expiresAt: new Date(Date.now() + 60_000) },
  });
  const authorization = await owner.metaAuthorization.create({
    data: { tenantId: tenant.id, onboardingSessionId: session.id, metaUserId: `user-${suffix}`, status: 'ACTIVE' },
  });
  const wabaId = `waba-${label}-${suffix}`;
  const waba = await owner.whatsappBusinessAccount.create({ data: { metaAuthorizationId: authorization.id, wabaId } });
  const phoneExternalId = `phone-${label}-${suffix}`;
  const phone = await owner.phoneNumber.create({
    data: {
      whatsappBusinessAccountId: waba.id,
      phoneNumberId: phoneExternalId,
      displayPhoneNumber: `+5939${suffix.slice(0, 8)}`,
      connectionState: 'OPERATIONAL',
      isOnBizApp: true,
    },
  });
  await owner.wabaRoute.create({ data: { wabaId, tenantId: tenant.id } });
  return { tenantId: tenant.id, wabaId, phoneRowId: phone.id, phoneExternalId };
}

async function cleanDatabase() {
  await owner.webhookWorkerHeartbeat.deleteMany();
  await owner.webhookQuarantineEvent.deleteMany();
  await owner.wabaWebhookSubscription.deleteMany();
  await owner.conversationAutomationState.deleteMany();
  await owner.messageEvent.deleteMany();
  await owner.integrationConfig.deleteMany();
  await owner.credential.deleteMany();
  await owner.phoneNumber.deleteMany();
  await owner.whatsappBusinessAccount.deleteMany();
  await owner.metaAuthorization.deleteMany();
  await owner.onboardingSession.deleteMany();
  await owner.auditLog.deleteMany();
  await owner.adminUser.deleteMany();
  await owner.wabaRoute.deleteMany();
  await owner.tenant.deleteMany();
}

beforeAll(async () => {
  await owner.$connect();
  await runtime.$connect();
  const app = express();
  app.use(createWhatsappWebhookRouter({ prisma: runtime, appSecret: APP_SECRET, verifyToken: VERIFY_TOKEN, payloadEncryptionKey: PAYLOAD_KEY }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await runtime.$disconnect();
  await owner.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
  tenantA = await seedTenant('a');
  tenantB = await seedTenant('b');
});

describe('Grupo A — seguridad HTTP del webhook', () => {
  it('verifica challenge y rechaza token, modo o challenge alterados', async () => {
    const ok = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('abc123');
    expect((await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`)).status).toBe(403);
    expect((await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=wrong&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=x`)).status).toBe(403);
    expect((await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}`)).status).toBe(403);
  });

  it('rechaza firma ausente, inválida o body modificado sin efectos', async () => {
    const payload = messagePayload(tenantA);
    const raw = Buffer.from(JSON.stringify(payload));
    const missing = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw });
    expect(missing.status).toBe(401);
    expect((await send(payload, `sha256=${'0'.repeat(64)}`)).status).toBe(401);
    const modified = Buffer.from(`${raw.toString('utf8')} `);
    const modifiedResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature(raw) }, body: modified,
    });
    expect(modifiedResponse.status).toBe(401);
    expect(await owner.messageEvent.count()).toBe(0);
  });

  it('rechaza JSON y estructura inválidos después de validar la firma', async () => {
    const malformed = Buffer.from('{not-json');
    const malformedResponse = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature(malformed) }, body: malformed,
    });
    expect(malformedResponse.status).toBe(400);
    expect((await send({ object: 'wrong', entry: [] })).status).toBe(400);
    expect(await owner.messageEvent.count()).toBe(0);
  });

  it('aplica límite de 1 MiB antes de persistir', async () => {
    const raw = Buffer.from(JSON.stringify({ padding: 'x'.repeat(1024 * 1024 + 10) }));
    const response = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature(raw) }, body: raw,
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'PAYLOAD_TOO_LARGE' });
    expect(await owner.messageEvent.count()).toBe(0);
  });

  it('devuelve 503 si PostgreSQL no está disponible y no confirma el evento a Meta', async () => {
    const unavailable = new PrismaClient({
      datasources: { db: { url: 'postgresql://nobody:nothing@127.0.0.1:55999/unavailable?schema=public&connect_timeout=1' } },
    });
    const unavailableApp = express();
    unavailableApp.use(createWhatsappWebhookRouter({
      prisma: unavailable, appSecret: APP_SECRET, verifyToken: VERIFY_TOKEN, payloadEncryptionKey: PAYLOAD_KEY,
    }));
    const unavailableServer = await new Promise<ReturnType<typeof unavailableApp.listen>>((resolve) => {
      const started = unavailableApp.listen(0, '127.0.0.1', () => resolve(started));
    });
    try {
      const raw = Buffer.from(JSON.stringify(messagePayload(tenantA, 'wamid.db-down')));
      const port = (unavailableServer.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/webhooks/meta/whatsapp`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature(raw) }, body: raw,
      });
      expect(response.status).toBe(503);
    } finally {
      await unavailable.$disconnect();
      await new Promise<void>((resolve, reject) => unavailableServer.close((error) => (error ? reject(error) : resolve())));
    }
  });
});

describe('Grupos B/C/D/F — clasificación, tenant e idempotencia', () => {
  it('persiste todas las entradas/cambios y mantiene tenants separados', async () => {
    const a = messagePayload(tenantA, 'wamid.a');
    const b = messagePayload(tenantB, 'wamid.b');
    const combined = { object: 'whatsapp_business_account', entry: [...a.entry, ...b.entry] };
    const response = await send(combined);
    expect(response.status).toBe(200);
    expect((await response.json()) as object).toMatchObject({ accepted: 2, duplicates: 0 });
    const events = await owner.messageEvent.findMany({ orderBy: { waMessageId: 'asc' } });
    expect(events.map((event) => [event.waMessageId, event.tenantId])).toEqual([
      ['wamid.a', tenantA.tenantId],
      ['wamid.b', tenantB.tenantId],
    ]);
  });

  it('cuarentena WABA desconocida, número desconocido, cruce entre tenants y número desconectado', async () => {
    const unknownWaba = messagePayload({ ...tenantA, wabaId: 'waba-unknown' });
    const unknownPhone = messagePayload({ ...tenantA, phoneExternalId: 'phone-unknown' }, 'wamid.unknown-phone');
    const crossed = messagePayload({ ...tenantA, phoneExternalId: tenantB.phoneExternalId }, 'wamid.crossed');
    await owner.phoneNumber.update({ where: { id: tenantB.phoneRowId }, data: { connectionState: 'DISCONNECTED' } });
    const disconnected = messagePayload(tenantB, 'wamid.disconnected');
    for (const payload of [unknownWaba, unknownPhone, crossed, disconnected]) expect((await send(payload)).status).toBe(200);
    expect(await owner.messageEvent.count()).toBe(0);
    expect(await owner.webhookQuarantineEvent.count()).toBe(4);
  });

  it('deduplica también reintentos de un evento en cuarentena', async () => {
    const payload = messagePayload({ ...tenantA, wabaId: 'waba-unknown-repeated' }, 'wamid.quarantine-repeat');
    await send(payload);
    await send(payload);
    const rows = await owner.webhookQuarantineEvent.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.duplicateCount).toBe(1);
  });

  it('recupera history, contactos, ecos y mensajes recibidos antes de OPERATIONAL sin duplicar efectos', async () => {
    await owner.phoneNumber.update({
      where: { id: tenantA.phoneRowId },
      data: { connectionState: 'PENDING_INTERNAL_SETUP' },
    });
    const payload = transitionWindowPayload(tenantA);

    const first = await send(payload);
    const repeatedWhilePending = await send(payload);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ accepted: 0, quarantined: 4 });
    expect(repeatedWhilePending.status).toBe(200);
    expect(await owner.messageEvent.count()).toBe(0);
    const held = await owner.webhookQuarantineEvent.findMany();
    expect(held).toHaveLength(4);
    expect(held.every((event) => event.recoveryState === 'PENDING' && event.duplicateCount === 1)).toBe(true);

    const effects: string[] = [];
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, async (event) => effects.push(event.classification), 'transition-worker');
    expect(await worker.runOnce(10)).toBe(0);
    const deferred = await owner.webhookQuarantineEvent.findMany();
    expect(deferred.every((event) => event.recoveryState === 'RETRY_PENDING' && event.recoveryAttempts === 0)).toBe(true);
    expect(deferred.every((event) => event.duplicateCount === 1)).toBe(true);

    await owner.phoneNumber.update({
      where: { id: tenantA.phoneRowId },
      data: { connectionState: 'OPERATIONAL', connectedAt: new Date() },
    });
    await owner.webhookQuarantineEvent.updateMany({ data: { nextRecoveryAt: new Date(0) } });
    expect(await worker.runOnce(10)).toBe(4);

    const recovered = await owner.messageEvent.findMany();
    expect(recovered).toHaveLength(4);
    expect(new Set(recovered.map((event) => event.eventCategory))).toEqual(
      new Set(['CUSTOMER_INBOUND', 'BUSINESS_APP_ECHO', 'CONTACT_SYNC', 'HISTORY_SYNC']),
    );
    expect(recovered.every((event) => event.processingState === 'PROCESSED')).toBe(true);
    expect(recovered.find((event) => event.eventCategory === 'CUSTOMER_INBOUND')?.eligibleForAutomation).toBe(true);
    expect(recovered.filter((event) => event.eventCategory !== 'CUSTOMER_INBOUND').every((event) => !event.eligibleForAutomation)).toBe(true);
    expect(effects).toHaveLength(4);
    expect((await owner.webhookQuarantineEvent.findMany()).every((event) => event.recoveryState === 'RECOVERED')).toBe(true);

    const retryAfterOperational = await send(payload);
    expect(await retryAfterOperational.json()).toMatchObject({ accepted: 0, duplicates: 4, quarantined: 0 });
    expect(await owner.messageEvent.count()).toBe(4);
  });

  it('recupera un evento que llegó antes de que la transacción de onboarding publicara WabaRoute', async () => {
    await owner.wabaRoute.delete({ where: { wabaId: tenantA.wabaId } });
    const payload = messagePayload(tenantA, 'wamid.before-route-commit');
    expect(await (await send(payload)).json()).toMatchObject({ accepted: 0, quarantined: 1 });
    expect(await owner.messageEvent.count()).toBe(0);
    expect(await owner.webhookQuarantineEvent.findFirstOrThrow()).toMatchObject({ reasonCode: 'UNKNOWN_WABA', recoveryState: 'PENDING' });

    // Simula el commit atómico de completeAuthorization: la ruta se vuelve
    // visible junto con el número ya OPERATIONAL.
    await owner.wabaRoute.create({ data: { wabaId: tenantA.wabaId, tenantId: tenantA.tenantId } });
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'pre-commit-window-worker');
    expect(await worker.runOnce()).toBe(1);
    expect(await owner.messageEvent.findFirstOrThrow()).toMatchObject({
      waMessageId: 'wamid.before-route-commit', processingState: 'PROCESSED',
    });
    expect(await owner.webhookQuarantineEvent.findFirstOrThrow()).toMatchObject({ recoveryState: 'RECOVERED', recoveredEventCount: 1 });
  });

  it('acepta evento administrativo sin número, pero nunca como entrante', async () => {
    const response = await send({
      object: 'whatsapp_business_account',
      entry: [{ id: tenantA.wabaId, time: 1_799_999_999, changes: [{ field: 'account_update', value: { event: 'PARTNER_REMOVED' } }] }],
    });
    expect(response.status).toBe(200);
    const event = await owner.messageEvent.findFirstOrThrow();
    expect(event).toMatchObject({ tenantId: tenantA.tenantId, phoneNumberId: null, eventCategory: 'ADMINISTRATIVE_EVENT', eligibleForAutomation: false });
  });

  it('diez entregas concurrentes producen una fila y nueve duplicados persistentes', async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => send(messagePayload(tenantA))));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const events = await owner.messageEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]!.duplicateCount).toBe(9);
  });

  it('distingue estados diferentes, deduplica el mismo estado y deduplica ecos manuales', async () => {
    const status = (state: string) => ({
      object: 'whatsapp_business_account',
      entry: [{ id: tenantA.wabaId, changes: [{ field: 'messages', value: { metadata: { phone_number_id: tenantA.phoneExternalId }, statuses: [{ id: 'wamid.out', status: state, recipient_id: '1555' }] } }] }],
    });
    await send(status('delivered'));
    await send(status('read'));
    await send(status('read'));
    await send(echoPayload(tenantA));
    await send(echoPayload(tenantA));
    const events = await owner.messageEvent.findMany({ orderBy: { eventCategory: 'asc' } });
    expect(events).toHaveLength(3);
    expect(events.find((event) => event.statusValue === 'read')?.duplicateCount).toBe(1);
    expect(events.find((event) => event.eventCategory === 'BUSINESS_APP_ECHO')?.duplicateCount).toBe(1);
  });
});

describe('Grupos E/G y E2E — worker, recuperación y equidad', () => {
  it('HTTP real -> inbox -> worker -> contrato normalizado; duplicado no crea efecto', async () => {
    await send(messagePayload(tenantA));
    await send(messagePayload(tenantA));
    await send(echoPayload(tenantA));
    const effects: string[] = [];
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, async (event) => effects.push(`${event.classification}:${event.internalEventId}`), 'e2e-worker');
    expect(await worker.runOnce(10)).toBe(2);
    const events = await owner.messageEvent.findMany({ orderBy: { eventCategory: 'asc' } });
    expect(events.every((event) => event.processingState === 'PROCESSED')).toBe(true);
    expect(events.find((event) => event.eventCategory === 'CUSTOMER_INBOUND')?.eligibleForAutomation).toBe(true);
    expect(events.find((event) => event.eventCategory === 'BUSINESS_APP_ECHO')?.eligibleForAutomation).toBe(false);
    expect(effects).toHaveLength(2);
    expect(events[0]!.normalizedPayload).toBeTruthy();
    expect(events.every((event) => !event.encryptedPayload.includes('synthetic hello'))).toBe(true);
    expect(await owner.webhookWorkerHeartbeat.findUnique({ where: { workerId: 'e2e-worker' } })).toMatchObject({
      status: 'RUNNING', processedCount: 2,
    });
  });

  it('una conversación bajo control humano deshabilita automatización', async () => {
    await new TenantScope(runtime, tenantA.tenantId).conversationAutomationState().setPaused({
      phoneNumberId: tenantA.phoneRowId, contactWaId: '15551112222', paused: true, reason: 'human_agent_assigned', by: 'test',
    });
    await send(messagePayload(tenantA));
    await new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'pause-worker').runOnce();
    expect((await owner.messageEvent.findFirstOrThrow()).eligibleForAutomation).toBe(false);
  });

  it('recupera un lease abandonado y no permite doble claim concurrente', async () => {
    await send(messagePayload(tenantA));
    const original = await owner.messageEvent.findFirstOrThrow();
    await owner.messageEvent.update({
      where: { id: original.id },
      data: { processingState: 'PROCESSING', leaseOwner: 'dead-worker', leaseExpiresAt: new Date(Date.now() - 1000) },
    });
    const workerA = new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'recovery-a');
    const workerB = new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'recovery-b');
    const [a, b] = await Promise.all([workerA.claim(), workerB.claim()]);
    expect(a.length + b.length).toBe(1);
    const claim = a[0] ?? b[0]!;
    await (a.length ? workerA : workerB).processClaim(claim);
    expect((await owner.messageEvent.findUniqueOrThrow({ where: { id: original.id } })).processingState).toBe('PROCESSED');
  });

  it('reintenta errores temporales y atiende un tenant B aunque A tenga backlog', async () => {
    for (let i = 0; i < 5; i += 1) await send(messagePayload(tenantA, `wamid.a.${i}`));
    await send(messagePayload(tenantB, 'wamid.b.fair'));
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, async () => { throw new Error('synthetic temporary failure'); }, 'retry-worker');
    expect(await worker.runOnce(10)).toBe(6);
    const retried = await owner.messageEvent.findMany({ where: { processingState: 'RETRY_PENDING' } });
    expect(new Set(retried.map((event) => event.tenantId))).toEqual(new Set([tenantA.tenantId, tenantB.tenantId]));
  });

  it('funciona sin Redis: PostgreSQL conserva y procesa la cola autoritativa', async () => {
    await send(messagePayload(tenantA, 'wamid.no-redis'));
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'postgres-only-worker');
    expect(await worker.runOnce()).toBe(1);
    expect((await owner.messageEvent.findFirstOrThrow()).processingState).toBe('PROCESSED');
  });

  it('agota reintentos, permite reproceso dentro del tenant y bloquea el tenant cruzado', async () => {
    await send(messagePayload(tenantA, 'wamid.dead-letter'));
    const event = await owner.messageEvent.findFirstOrThrow();
    await owner.messageEvent.update({ where: { id: event.id }, data: { processingAttempts: 4 } });
    const worker = new WebhookWorker(runtime, PAYLOAD_KEY, async () => { throw new Error('persistent synthetic failure'); }, 'dead-worker-test');
    await worker.runOnce();
    expect((await owner.messageEvent.findUniqueOrThrow({ where: { id: event.id } })).processingState).toBe('MANUAL_INTERVENTION');
    expect(await reprocessWebhookEvent(runtime, tenantB.tenantId, event.id)).toBe(false);
    expect(await reprocessWebhookEvent(runtime, tenantA.tenantId, event.id)).toBe(true);
    expect((await owner.messageEvent.findUniqueOrThrow({ where: { id: event.id } })).processingState).toBe('PENDING');
  });

  it('un payload cifrado manipulado queda en cuarentena, no bloquea el worker', async () => {
    await send(messagePayload(tenantA, 'wamid.tampered'));
    const event = await owner.messageEvent.findFirstOrThrow();
    await owner.messageEvent.update({ where: { id: event.id }, data: { encryptedPayload: `${event.encryptedPayload}tampered` } });
    await new WebhookWorker(runtime, PAYLOAD_KEY, undefined, 'tamper-worker').runOnce();
    expect(await owner.messageEvent.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({
      processingState: 'QUARANTINED', lastErrorCode: 'PAYLOAD_DECRYPTION_FAILED',
    });
  });

  it('un procesador bloqueado vence por timeout y queda listo para reintento', async () => {
    await send(messagePayload(tenantA, 'wamid.timeout'));
    const worker = new WebhookWorker(
      runtime,
      PAYLOAD_KEY,
      () => new Promise(() => undefined),
      'timeout-worker',
      10,
    );
    await worker.runOnce();
    expect(await owner.messageEvent.findFirstOrThrow()).toMatchObject({
      processingState: 'RETRY_PENDING', lastErrorCode: 'PROCESSOR_TEMPORARY_FAILURE',
    });
  });
});

describe('Suscripción WABA preparada con Graph simulado', () => {
  it('comprueba primero, suscribe una sola vez y registra el resultado por tenant', async () => {
    const authorization = await owner.metaAuthorization.findFirstOrThrow({ where: { tenantId: tenantA.tenantId } });
    await owner.credential.create({
      data: {
        metaAuthorizationId: authorization.id,
        kind: 'WHATSAPP_ACCESS_TOKEN',
        encryptedValue: encryptToken('synthetic-access-token', PAYLOAD_KEY),
      },
    });
    let subscribed = false;
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'GET') return new Response(JSON.stringify({ data: subscribed ? [{ id: 'app-stage3' }] : [] }), { status: 200 });
      subscribed = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };
    const graphClient = new MetaGraphClient({
      graphApiVersion: 'v25.0', appId: 'app-stage3', appSecret: 'synthetic', fetchImpl: fetchImpl as typeof fetch,
    });
    expect(await ensureWabaSubscription({
      prisma: runtime, tenantId: tenantA.tenantId, wabaId: tenantA.wabaId, graphClient, encryptionKey: PAYLOAD_KEY,
    })).toBe('SUBSCRIBED');
    expect(await ensureWabaSubscription({
      prisma: runtime, tenantId: tenantA.tenantId, wabaId: tenantA.wabaId, graphClient, encryptionKey: PAYLOAD_KEY,
    })).toBe('ALREADY_SUBSCRIBED');
    expect(await owner.wabaWebhookSubscription.findUnique({ where: { wabaId: tenantA.wabaId } })).toMatchObject({
      tenantId: tenantA.tenantId, status: 'SUBSCRIBED',
    });
  });
});
