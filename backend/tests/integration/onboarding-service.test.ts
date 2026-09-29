import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { issueInvitationToken } from '../../src/access/invitationToken.js';
import { MetaGraphApiError, MetaGraphClient, type WabaPhoneNumber } from '../../src/meta/graphClient.js';
import { OnboardingError, completeOnboarding, recordSessionInfo, startOnboarding, type OnboardingDeps } from '../../src/onboarding/service.js';
import { decryptToken } from '../../src/crypto/tokenCipher.js';

/**
 * Etapa 2 — pruebas de extremo a extremo del flujo de onboarding, contra
 * Postgres y Redis REALES (docker-compose.test.yml), con Meta Graph API
 * simulada (fetch mockeado) — exactamente lo que pidió la condición final:
 * "Utiliza Meta Graph API simulada para las pruebas automatizadas".
 */

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:55564';

const INVITATION_SECRET = 'test-invitation-secret-do-not-use-in-prod';
const SESSION_SECRET = 'test-onboarding-session-secret-do-not-use-in-prod';
const ENCRYPTION_KEY = Buffer.from('a'.repeat(64), 'hex');

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
const redis = new Redis(TEST_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Construye un MetaGraphClient con respuestas simuladas fijas de Coexistence exitosa. */
function makeHappyGraphClient(overrides?: { phoneNumbers?: WabaPhoneNumber[]; meId?: string; accessToken?: string }) {
  const accessToken = overrides?.accessToken ?? 'simulated-access-token';
  const meId = overrides?.meId ?? 'meta-user-simulated';
  const phoneNumbers = overrides?.phoneNumbers ?? [
    { id: 'phone-coexistence-1', displayPhoneNumber: '+593999000001', isOnBizApp: true, platformType: 'CLOUD_API' },
  ];

  const fetchImpl = vi.fn(async (url: string | URL) => {
    const href = String(url);
    if (href.includes('/oauth/access_token')) return jsonResponse({ access_token: accessToken, token_type: 'bearer', expires_in: 5184000 });
    if (href.includes('/me?')) return jsonResponse({ id: meId });
    if (href.includes('/phone_numbers')) {
      return jsonResponse({
        data: phoneNumbers.map((p) => ({
          id: p.id,
          display_phone_number: p.displayPhoneNumber,
          is_on_biz_app: p.isOnBizApp,
          platform_type: p.platformType,
        })),
      });
    }
    if (href.includes('/subscribed_apps')) return jsonResponse({ success: true });
    throw new Error(`Unexpected simulated Graph API call: ${href}`);
  });

  return new MetaGraphClient({ graphApiVersion: 'v25.0', appId: 'test-app', appSecret: 'test-secret', fetchImpl: fetchImpl as unknown as typeof fetch });
}

function makeDeps(graphClient: MetaGraphClient): OnboardingDeps {
  return { prisma, redis, graphClient, invitationSecret: INVITATION_SECRET, sessionSecret: SESSION_SECRET, encryptionKey: ENCRYPTION_KEY };
}

let tenantA: { id: string };
let adminA: { id: string };
let tenantB: { id: string };

beforeAll(async () => {
  await prisma.$connect();
  await redis.connect();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

beforeEach(async () => {
  await prisma.messageEvent.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.phoneNumber.deleteMany();
  await prisma.whatsappBusinessAccount.deleteMany();
  await prisma.metaAuthorization.deleteMany();
  await prisma.onboardingSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.tenant.deleteMany();
  await redis.flushdb();

  tenantA = await prisma.tenant.create({ data: { name: 'Cliente Ficticio A', slug: `cliente-a-${randomBytes(4).toString('hex')}` } });
  adminA = await prisma.adminUser.create({ data: { tenantId: tenantA.id, email: `admin-a-${randomBytes(4).toString('hex')}@example.com` } });
  tenantB = await prisma.tenant.create({ data: { name: 'Cliente Ficticio B', slug: `cliente-b-${randomBytes(4).toString('hex')}` } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function issueInvite(tenantId = tenantA.id, adminUserId = adminA.id, ttlSeconds?: number) {
  return issueInvitationToken({ tenantId, adminUserId, ttlSeconds }, INVITATION_SECRET);
}

describe('startOnboarding', () => {
  it('crea una OnboardingSession scoped al tenant del token de invitación y devuelve un sessionToken válido', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const invite = issueInvite();

    const result = await startOnboarding(deps, { invitationToken: invite });
    expect(result.sessionToken).toEqual(expect.any(String));

    const sessions = await prisma.onboardingSession.findMany({ where: { tenantId: tenantA.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.state).toBe('AWAITING_AUTHORIZATION');
  });

  it('un token de invitación reutilizado (segundo /start) se rechaza — de un solo uso', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const invite = issueInvite();

    await startOnboarding(deps, { invitationToken: invite });
    await expect(startOnboarding(deps, { invitationToken: invite })).rejects.toThrow(/already been used/i);

    // Y no crea una segunda sesión.
    const sessions = await prisma.onboardingSession.findMany({ where: { tenantId: tenantA.id } });
    expect(sessions).toHaveLength(1);
  });

  it('un token de invitación expirado se rechaza sin crear ninguna sesión', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const invite = issueInvite(tenantA.id, adminA.id, -10);

    await expect(startOnboarding(deps, { invitationToken: invite })).rejects.toThrow(/expired/i);
    expect(await prisma.onboardingSession.count()).toBe(0);
  });

  it('un token firmado con un secreto distinto (manipulado) se rechaza', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const forged = issueInvitationToken({ tenantId: tenantA.id, adminUserId: adminA.id }, 'wrong-secret');

    await expect(startOnboarding(deps, { invitationToken: forged })).rejects.toThrow(/signature/i);
  });
});

describe('recordSessionInfo + completeOnboarding — camino feliz', () => {
  it('completa el onboarding: persiste WABA + número + credencial cifrada, marca la sesión OPERATIONAL', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const invite = issueInvite();
    const { sessionToken } = await startOnboarding(deps, { invitationToken: invite });

    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-happy-1' } });
    const result = await completeOnboarding(deps, { sessionToken, authorizationCode: 'valid-code' });

    expect(result).toEqual({ wabaId: 'waba-happy-1', phoneNumberId: 'phone-coexistence-1', displayPhoneNumber: '+593999000001' });

    const session = await prisma.onboardingSession.findFirst({ where: { tenantId: tenantA.id } });
    expect(session?.state).toBe('OPERATIONAL');

    const waba = await prisma.whatsappBusinessAccount.findUnique({ where: { wabaId: 'waba-happy-1' } });
    expect(waba).not.toBeNull();

    const phone = await prisma.phoneNumber.findUnique({ where: { phoneNumberId: 'phone-coexistence-1' } });
    expect(phone?.connectionState).toBe('OPERATIONAL');
    expect(phone?.isOnBizApp).toBe(true);

    const credential = await prisma.credential.findFirst({ where: { metaAuthorizationId: waba!.metaAuthorizationId } });
    expect(credential).not.toBeNull();
    // La credencial persistida está cifrada, no en texto plano — y se descifra
    // exactamente al access_token simulado que devolvió Graph API.
    expect(credential?.encryptedValue).not.toContain('simulated-access-token');
    expect(decryptToken(credential!.encryptedValue, ENCRYPTION_KEY)).toBe('simulated-access-token');
  });

  it('una sesión ya completada rechaza un segundo intento de completar (no permite reutilizar una autorización anterior)', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const invite = issueInvite();
    const { sessionToken } = await startOnboarding(deps, { invitationToken: invite });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-happy-2' } });
    await completeOnboarding(deps, { sessionToken, authorizationCode: 'valid-code' });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'valid-code' })).rejects.toMatchObject({
      code: 'SESSION_ALREADY_COMPLETED',
    });
    await expect(recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-happy-2' } })).rejects.toMatchObject({
      code: 'SESSION_ALREADY_COMPLETED',
    });
  });
});

describe('completeOnboarding — validación de identificadores explícitos vs. sessionInfo', () => {
  it('si sessionInfo trae un phoneNumberId específico, usa ESE número, no "el primero de la lista"', async () => {
    const deps = makeDeps(
      makeHappyGraphClient({
        phoneNumbers: [
          { id: 'phone-decoy', displayPhoneNumber: '+593900000000', isOnBizApp: true, platformType: 'CLOUD_API' },
          { id: 'phone-target', displayPhoneNumber: '+593911111111', isOnBizApp: true, platformType: 'CLOUD_API' },
        ],
      }),
    );
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-explicit', phoneNumberId: 'phone-target' } });

    const result = await completeOnboarding(deps, { sessionToken, authorizationCode: 'code' });
    expect(result.phoneNumberId).toBe('phone-target');
  });

  it('rechaza si el número solicitado no está en is_on_biz_app (no es realmente Coexistence) — nunca continúa silenciosamente', async () => {
    const deps = makeDeps(
      makeHappyGraphClient({
        phoneNumbers: [{ id: 'phone-not-coexistence', displayPhoneNumber: '+593922222222', isOnBizApp: false, platformType: 'CLOUD_API' }],
      }),
    );
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-not-coex', phoneNumberId: 'phone-not-coexistence' } });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'code' })).rejects.toMatchObject({ code: 'NOT_COEXISTENCE' });

    const phone = await prisma.phoneNumber.findUnique({ where: { phoneNumberId: 'phone-not-coexistence' } });
    expect(phone).toBeNull(); // nunca se persistió

    const session = await prisma.onboardingSession.findFirst({ where: { tenantId: tenantA.id } });
    expect(session?.state).toBe('RECOVERABLE_ERROR');
  });

  it('rechaza si la WABA autorizada no tiene ningún número', async () => {
    const deps = makeDeps(makeHappyGraphClient({ phoneNumbers: [] }));
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-empty' } });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'code' })).rejects.toMatchObject({ code: 'NO_PHONE_NUMBERS' });
  });

  it('rechaza si el phoneNumberId pedido no aparece entre los números de la WABA', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-happy-1', phoneNumberId: 'does-not-exist' } });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'code' })).rejects.toMatchObject({ code: 'PHONE_NUMBER_NOT_FOUND' });
  });

  it('completeOnboarding antes de recordSessionInfo se rechaza (falta wabaId)', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'code' })).rejects.toMatchObject({ code: 'MISSING_SESSION_INFO' });
  });
});

describe('completeOnboarding — número ya conectado a otro tenant (privacidad + unicidad global)', () => {
  it('rechaza con PHONE_ALREADY_CONNECTED sin revelar a qué tenant pertenece el número', async () => {
    // Tenant B ya tiene este número conectado (simulando un onboarding previo).
    const depsB = makeDeps(makeHappyGraphClient({ phoneNumbers: [{ id: 'contested-phone', displayPhoneNumber: '+593933333333', isOnBizApp: true, platformType: 'CLOUD_API' }] }));
    const adminB = await prisma.adminUser.create({ data: { tenantId: tenantB.id, email: `admin-b-${randomBytes(4).toString('hex')}@example.com` } });
    const inviteB = issueInvitationToken({ tenantId: tenantB.id, adminUserId: adminB.id }, INVITATION_SECRET);
    const { sessionToken: sessionTokenB } = await startOnboarding(depsB, { invitationToken: inviteB });
    await recordSessionInfo(depsB, { sessionToken: sessionTokenB, sessionInfo: { wabaId: 'waba-b-contested' } });
    await completeOnboarding(depsB, { sessionToken: sessionTokenB, authorizationCode: 'code' });

    // Tenant A ahora intenta conectar el MISMO número (mismo phoneNumberId, WABA distinta).
    const depsA = makeDeps(makeHappyGraphClient({ phoneNumbers: [{ id: 'contested-phone', displayPhoneNumber: '+593933333333', isOnBizApp: true, platformType: 'CLOUD_API' }] }));
    const { sessionToken: sessionTokenA } = await startOnboarding(depsA, { invitationToken: issueInvite() });
    await recordSessionInfo(depsA, { sessionToken: sessionTokenA, sessionInfo: { wabaId: 'waba-a-contested' } });

    const attempt = completeOnboarding(depsA, { sessionToken: sessionTokenA, authorizationCode: 'code' });
    await expect(attempt).rejects.toMatchObject({ code: 'PHONE_ALREADY_CONNECTED' });
    await expect(attempt).rejects.not.toThrow(/tenant.{0,20}b/i);

    const session = await prisma.onboardingSession.findFirst({ where: { tenantId: tenantA.id } });
    expect(session?.state).toBe('RECOVERABLE_ERROR');
  });
});

describe('completeOnboarding — fallos de Graph API (simulados)', () => {
  it('código de autorización inválido/expirado -> CODE_EXCHANGE_FAILED, sesión marcada recuperable', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: 'This authorization code has expired.', code: 'OAuthException' } }, 400));
    const graphClient = new MetaGraphClient({ graphApiVersion: 'v25.0', appId: 'a', appSecret: 's', fetchImpl: fetchImpl as unknown as typeof fetch });
    const deps = makeDeps(graphClient);
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-fail' } });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'expired-code' })).rejects.toMatchObject({ code: 'CODE_EXCHANGE_FAILED' });
    const session = await prisma.onboardingSession.findFirst({ where: { tenantId: tenantA.id } });
    expect(session?.state).toBe('RECOVERABLE_ERROR');
  });

  it('fallo al suscribir la app a la WABA NO deshace la conexión ya persistida — es recuperable, no destructivo', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url);
      call += 1;
      if (href.includes('/oauth/access_token')) return jsonResponse({ access_token: 'tok', token_type: 'bearer' });
      if (href.includes('/me?')) return jsonResponse({ id: 'meta-user-sub-fail' });
      if (href.includes('/phone_numbers')) {
        return jsonResponse({ data: [{ id: 'phone-sub-fail', display_phone_number: '+593944444444', is_on_biz_app: true, platform_type: 'CLOUD_API' }] });
      }
      if (href.includes('/subscribed_apps')) return jsonResponse({ error: { message: 'temporary failure', code: 'ServerError' } }, 500);
      throw new Error(`unexpected call #${call}: ${href}`);
    });
    const graphClient = new MetaGraphClient({ graphApiVersion: 'v25.0', appId: 'a', appSecret: 's', fetchImpl: fetchImpl as unknown as typeof fetch });
    const deps = makeDeps(graphClient);
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });
    await recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'waba-sub-fail' } });

    await expect(completeOnboarding(deps, { sessionToken, authorizationCode: 'code' })).rejects.toMatchObject({ code: 'SUBSCRIBE_FAILED' });

    // La conexión SÍ quedó persistida a pesar del fallo de suscripción.
    const phone = await prisma.phoneNumber.findUnique({ where: { phoneNumberId: 'phone-sub-fail' } });
    expect(phone?.connectionState).toBe('OPERATIONAL');

    const session = await prisma.onboardingSession.findFirst({ where: { tenantId: tenantA.id } });
    expect(session?.state).toBe('RECOVERABLE_ERROR');
  });
});

describe('sessionToken — expiración y forjado', () => {
  it('un sessionToken con firma inválida se rechaza como INVALID_SESSION_TOKEN', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    await expect(recordSessionInfo(deps, { sessionToken: 'forged.token', sessionInfo: { wabaId: 'x' } })).rejects.toMatchObject({
      code: 'INVALID_SESSION_TOKEN',
    });
  });

  it('una sesión expirada (fila con expiresAt en el pasado) se rechaza como SESSION_EXPIRED, incluso con un sessionToken de firma válida', async () => {
    const deps = makeDeps(makeHappyGraphClient());
    const { sessionToken } = await startOnboarding(deps, { invitationToken: issueInvite() });

    // Simula el paso del tiempo: retrocede expiresAt directamente en la BD
    // (el sessionToken en sí no lleva TTL de sobra suficiente para forzar
    // esto de otra forma en una prueba determinista).
    await prisma.onboardingSession.updateMany({ where: { tenantId: tenantA.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    await expect(recordSessionInfo(deps, { sessionToken, sessionInfo: { wabaId: 'x' } })).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });
});
