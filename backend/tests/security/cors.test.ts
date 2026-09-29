import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import { createApp } from '../../src/app.js';
import { ConfigError, getAllowedOrigins } from '../../src/config/env.js';
import type { MetaGraphClient } from '../../src/meta/graphClient.js';

const requiredTestEnv = {
  ALLOWED_ORIGINS: 'https://www.maiatesta.com',
} as const;
const previousEnv = Object.fromEntries(
  Object.keys(requiredTestEnv).map((name) => [name, process.env[name]]),
);
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;

beforeAll(async () => {
  Object.assign(process.env, requiredTestEnv);
  const app = createApp({
    prisma: {} as PrismaClient,
    appSecret: 'test-app-secret',
    verifyToken: 'test-verify-token',
    payloadEncryptionKey: Buffer.from('1'.repeat(64), 'hex'),
    onboardingDeps: {
      prisma: {} as PrismaClient,
      redis: {} as Redis,
      graphClient: {} as MetaGraphClient,
      invitationSecret: 'test-invitation-secret',
      sessionSecret: 'test-session-secret',
      encryptionKey: Buffer.from('2'.repeat(64), 'hex'),
    },
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  for (const name of Object.keys(requiredTestEnv)) {
    const previous = previousEnv[name];
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
});

describe('CORS mínimo y exacto', () => {
  it('autoriza el origen configurado únicamente en onboarding', async () => {
    const allowed = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://www.maiatesta.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://www.maiatesta.com');
    expect(allowed.headers.get('access-control-allow-credentials')).toBeNull();

    const health = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://www.maiatesta.com' },
    });
    expect(health.headers.get('access-control-allow-origin')).toBeNull();

    const webhook = await fetch(`${baseUrl}/webhooks/meta/whatsapp`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://www.maiatesta.com' },
    });
    expect(webhook.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('no entrega una cabecera CORS a un origen no autorizado', async () => {
    const response = await fetch(`${baseUrl}/onboarding/start`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://attacker.example',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rechaza comodines y HTTP remoto en configuración', () => {
    process.env.ALLOWED_ORIGINS = '*';
    expect(() => getAllowedOrigins()).toThrow(
      new ConfigError('ALLOWED_ORIGINS must contain exact origins; wildcard is forbidden.'),
    );

    process.env.ALLOWED_ORIGINS = 'http://www.maiatesta.com';
    expect(() => getAllowedOrigins()).toThrow(
      new ConfigError('ALLOWED_ORIGINS must contain exact HTTPS origins (HTTP is local-only).'),
    );

    process.env.ALLOWED_ORIGINS = 'https://www.maiatesta.com';
    expect(getAllowedOrigins()).toEqual(['https://www.maiatesta.com']);
  });
});
