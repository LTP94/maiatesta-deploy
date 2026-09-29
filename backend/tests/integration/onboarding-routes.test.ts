import type { AddressInfo } from 'node:net';
import { randomBytes } from 'node:crypto';
import express, { type Express } from 'express';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { issueInvitationToken } from '../../src/access/invitationToken.js';
import { MetaGraphClient } from '../../src/meta/graphClient.js';
import { createOnboardingRouter } from '../../src/onboarding/routes.js';
import type { OnboardingDeps } from '../../src/onboarding/service.js';

/**
 * Pruebas a nivel HTTP de las rutas de onboarding — confirman los códigos de
 * estado y formas de respuesta reales que verá el frontend/administrador,
 * por encima de la lógica ya probada en onboarding-service.test.ts. Usa un
 * servidor Express efímero (app.listen(0)) y `fetch` nativo de Node — sin
 * añadir una dependencia nueva (p. ej. supertest) solo para esto.
 */

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:55564';

const INVITATION_SECRET = 'test-invitation-secret-do-not-use-in-prod';
const SESSION_SECRET = 'test-onboarding-session-secret-do-not-use-in-prod';
const ENCRYPTION_KEY = Buffer.from('b'.repeat(64), 'hex');

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
const redis = new Redis(TEST_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeHappyGraphClient() {
  const fetchImpl = vi.fn(async (url: string | URL) => {
    const href = String(url);
    if (href.includes('/oauth/access_token')) return jsonResponse({ access_token: 'tok-route-test', token_type: 'bearer' });
    if (href.includes('/me?')) return jsonResponse({ id: 'meta-user-route-test' });
    if (href.includes('/phone_numbers')) {
      return jsonResponse({ data: [{ id: 'phone-route-1', display_phone_number: '+593955555555', is_on_biz_app: true, platform_type: 'CLOUD_API' }] });
    }
    if (href.includes('/subscribed_apps')) return jsonResponse({ success: true });
    throw new Error(`unexpected call: ${href}`);
  });
  return new MetaGraphClient({ graphApiVersion: 'v25.0', appId: 'a', appSecret: 's', fetchImpl: fetchImpl as unknown as typeof fetch });
}

let app: Express;
let server: ReturnType<Express['listen']>;
let baseUrl: string;
let tenant: { id: string };
let admin: { id: string };

function startServer(deps: OnboardingDeps) {
  app = express();
  app.use(express.json());
  app.use(createOnboardingRouter(deps));
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

async function stopServer() {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

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

  tenant = await prisma.tenant.create({ data: { name: 'Cliente HTTP', slug: `cliente-http-${randomBytes(4).toString('hex')}` } });
  admin = await prisma.adminUser.create({ data: { tenantId: tenant.id, email: `admin-http-${randomBytes(4).toString('hex')}@example.com` } });

  await startServer({
    prisma,
    redis,
    graphClient: makeHappyGraphClient(),
    invitationSecret: INVITATION_SECRET,
    sessionSecret: SESSION_SECRET,
    encryptionKey: ENCRYPTION_KEY,
  });
});

afterEach(async () => {
  await stopServer();
  vi.restoreAllMocks();
});

function invite() {
  return issueInvitationToken({ tenantId: tenant.id, adminUserId: admin.id }, INVITATION_SECRET);
}

describe('POST /onboarding/start', () => {
  it('201 + sessionToken con un invitationToken válido', async () => {
    const res = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: invite() }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { sessionToken: string; expiresAt: string };
    expect(body.sessionToken).toEqual(expect.any(String));
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('400 si falta invitationToken en el body', async () => {
    const res = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('INVALID_REQUEST');
  });

  it('401 genérico (sin distinguir motivo) con un invitationToken inválido/reutilizado', async () => {
    const token = invite();
    const first = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: token }),
    });
    expect(first.status).toBe(201);

    const second = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: token }),
    });
    expect(second.status).toBe(401);
    const body = (await second.json()) as { error: string; message: string };
    expect(body.error).toBe('INVALID_INVITATION');

    // Un token con firma inválida (nunca emitido) produce EXACTAMENTE la
    // misma respuesta que uno reutilizado — el cliente no puede distinguir
    // "ya usado" de "firma inválida" a partir de la respuesta HTTP (condición
    // 6, Etapa 2: "no exponen información sensible" / no da pistas útiles a
    // fuerza bruta).
    const forged = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: 'forged.notreal' }),
    });
    expect(forged.status).toBe(401);
    const forgedBody = (await forged.json()) as { error: string; message: string };
    expect(forgedBody).toEqual(body);
  });
});

describe('flujo completo vía HTTP: start -> session -> complete', () => {
  it('200 con el resultado de la conexión, y persiste correctamente', async () => {
    const startRes = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: invite() }),
    });
    const { sessionToken } = (await startRes.json()) as { sessionToken: string };

    const sessionRes = await fetch(`${baseUrl}/onboarding/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, sessionInfo: { wabaId: 'waba-http-1' } }),
    });
    expect(sessionRes.status).toBe(204);

    const completeRes = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, authorizationCode: 'code' }),
    });
    expect(completeRes.status).toBe(200);
    const body = (await completeRes.json()) as { wabaId: string; phoneNumberId: string };
    expect(body).toEqual({ wabaId: 'waba-http-1', phoneNumberId: 'phone-route-1', displayPhoneNumber: '+593955555555' });
  });

  it('401 en /session y /complete con un sessionToken con firma inválida', async () => {
    const sessionRes = await fetch(`${baseUrl}/onboarding/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: 'not-a-real-token', sessionInfo: {} }),
    });
    expect(sessionRes.status).toBe(401);

    const completeRes = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: 'not-a-real-token', authorizationCode: 'x' }),
    });
    expect(completeRes.status).toBe(401);
  });

  it('409 al intentar completar dos veces la misma sesión', async () => {
    const startRes = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: invite() }),
    });
    const { sessionToken } = (await startRes.json()) as { sessionToken: string };
    await fetch(`${baseUrl}/onboarding/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, sessionInfo: { wabaId: 'waba-http-dup' } }),
    });
    await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, authorizationCode: 'code' }),
    });

    const secondComplete = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, authorizationCode: 'code' }),
    });
    expect(secondComplete.status).toBe(409);
  });

  it('400 si /complete recibe un body sin authorizationCode', async () => {
    const startRes = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: invite() }),
    });
    const { sessionToken } = (await startRes.json()) as { sessionToken: string };

    const res = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    });
    expect(res.status).toBe(400);
  });
});
