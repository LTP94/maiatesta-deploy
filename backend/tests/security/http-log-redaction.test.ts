import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';
import type { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import type { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { MetaGraphClient } from '../../src/meta/graphClient.js';
import type { OnboardingDeps } from '../../src/onboarding/service.js';

/**
 * Prueba de regresión — auditoría de registros del backend WhatsApp
 * (2026-09-29), hallazgo V1. Reproduce el fallo real usando ÚNICAMENTE
 * credenciales ficticias generadas para esta prueba — nunca un secreto
 * real, nunca contra Hostinger.
 *
 * Corre la aplicación REAL (`createApp()`, el mismo factory que usa
 * `src/index.ts` en producción) con un stream de Pino capturado en memoria
 * en vez de stdout, dispara peticiones HTTP reales contra un servidor
 * efímero, y verifica EXACTAMENTE qué quedó serializado en el log —
 * no infiere el comportamiento leyendo código, lo observa.
 *
 * Se ejecutó primero contra `src/app.ts` sin el fix (solo con el `redact`
 * original) — falló, confirmando el hallazgo. Después del fix (serializer
 * de allow-list), la misma prueba pasa sin cambiar ninguna aserción de
 * comportamiento HTTP (status/body), lo que demuestra que el fix es
 * puramente de logging.
 */

class CapturingStream extends Writable {
  private chunks: string[] = [];

  override _write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString('utf8'));
    callback();
  }

  get rawText(): string {
    return this.chunks.join('');
  }

  get lines(): Record<string, unknown>[] {
    return this.rawText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }
}

const FAKE_VERIFY_TOKEN = 'FAKE_VERIFY_TOKEN_FOR_REGRESSION_TEST_9f8e7d6c5b';
const FAKE_APP_SECRET = 'fake-app-secret-for-regression-test-only';
const FAKE_BEARER_SECRET = 'FAKE_BEARER_SECRET_SHOULD_NEVER_APPEAR_IN_LOGS';
const FAKE_COOKIE_SECRET = 'FAKE_COOKIE_SECRET_SHOULD_NEVER_APPEAR_IN_LOGS';
const FAKE_SIGNATURE_SECRET = 'FAKE_SIGNATURE_SHOULD_NEVER_APPEAR_IN_LOGS';
const ARBITRARY_QUERY_SECRET = 'ARBITRARY_QUERY_PARAM_SHOULD_NEVER_APPEAR_IN_LOGS';

const ALL_FAKE_SECRETS = [FAKE_VERIFY_TOKEN, FAKE_BEARER_SECRET, FAKE_COOKIE_SECRET, FAKE_SIGNATURE_SECRET, ARBITRARY_QUERY_SECRET];

function buildFakeOnboardingDeps(): OnboardingDeps {
  return {
    prisma: {} as PrismaClient, // nunca se invoca: ninguna petición de esta prueba llega a tocar la base de datos
    redis: {} as Redis,
    graphClient: {} as MetaGraphClient,
    invitationSecret: 'fake-invitation-secret-for-regression-test',
    sessionSecret: 'fake-session-secret-for-regression-test',
    encryptionKey: Buffer.alloc(32, 7),
  };
}

let stream: CapturingStream;
let app: Express;
let server: ReturnType<Express['listen']>;
let baseUrl: string;

beforeEach(async () => {
  stream = new CapturingStream();
  app = createApp({
    prisma: {} as PrismaClient,
    appSecret: FAKE_APP_SECRET,
    verifyToken: FAKE_VERIFY_TOKEN,
    payloadEncryptionKey: Buffer.alloc(32, 9),
    onboardingDeps: buildFakeOnboardingDeps(),
    logStream: stream,
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('registro HTTP — el token de verificación de Meta nunca aparece en el log', () => {
  it('verificación VÁLIDA: responde el challenge y no deja el token en ningún campo del log', async () => {
    const res = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${FAKE_VERIFY_TOKEN}&hub.challenge=audit-challenge-abc`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('audit-challenge-abc');

    expect(stream.rawText).not.toContain(FAKE_VERIFY_TOKEN);
    const reqLine = stream.lines.find((line) => (line.req as { method?: string } | undefined)?.method === 'GET');
    expect(reqLine).toBeDefined();
    const req = reqLine!.req as { url?: string; query?: unknown };
    expect(req.url).not.toContain('?');
    expect(req.query).toBeUndefined();
  });

  it('verificación INVÁLIDA: sigue respondiendo 403 y el token ficticio de un intento fallido tampoco queda en el log', async () => {
    const res = await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${FAKE_VERIFY_TOKEN}_WRONG&hub.challenge=x`);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'WEBHOOK_VERIFICATION_FAILED' });

    expect(stream.rawText).not.toContain(FAKE_VERIFY_TOKEN);
    expect(stream.rawText).not.toContain(`${FAKE_VERIFY_TOKEN}_WRONG`);
  });

  it('un parámetro de query arbitrario en CUALQUIER ruta (incluida una que no existe) nunca aparece — la protección es global, no específica del webhook', async () => {
    const res = await fetch(`${baseUrl}/no-existe-esta-ruta?secreto=${ARBITRARY_QUERY_SECRET}`);
    expect(res.status).toBe(404);
    expect(stream.rawText).not.toContain(ARBITRARY_QUERY_SECRET);
  });

  it('cabeceras sensibles (Authorization, Cookie, X-Hub-Signature-256) nunca aparecen como valores en el log', async () => {
    const res = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FAKE_BEARER_SECRET}`,
        Cookie: `session=${FAKE_COOKIE_SECRET}`,
        'X-Hub-Signature-256': `sha256=${FAKE_SIGNATURE_SECRET}`,
      },
      body: JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
    });
    expect(res.status).toBe(401); // firma inválida — comportamiento esperado, no cambia con el fix
    expect(await res.json()).toEqual({ error: 'INVALID_SIGNATURE' });

    expect(stream.rawText).not.toContain(FAKE_BEARER_SECRET);
    expect(stream.rawText).not.toContain(FAKE_COOKIE_SECRET);
    expect(stream.rawText).not.toContain(FAKE_SIGNATURE_SECRET);
  });

  it('ningún secreto ficticio de esta suite aparece en ningún punto del stream completo de log, tras ejercitar todas las rutas anteriores', async () => {
    await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${FAKE_VERIFY_TOKEN}&hub.challenge=x`);
    await fetch(`${baseUrl}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
    await fetch(`${baseUrl}/no-existe?secreto=${ARBITRARY_QUERY_SECRET}`);
    await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FAKE_BEARER_SECRET}`, Cookie: `x=${FAKE_COOKIE_SECRET}` },
      body: '{}',
    });

    for (const secret of ALL_FAKE_SECRETS) {
      expect(stream.rawText).not.toContain(secret);
    }
  });
});
