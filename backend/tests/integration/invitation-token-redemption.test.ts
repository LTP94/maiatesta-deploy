import Redis from 'ioredis';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InvitationTokenError, issueInvitationToken } from '../../src/access/invitationToken.js';
import { isJtiConsumed, redeemInvitationToken, tryConsumeJti } from '../../src/access/invitationTokenStore.js';

/**
 * Condiciones 4 y 7 de la Etapa 2 — "no pueden utilizarse más de una vez
 * para iniciar conexiones independientes" / "no permiten reutilizar una
 * autorización anterior". Requiere Redis real (docker-compose.test.yml,
 * puerto 55564) — el consumo de un solo uso depende de estado compartido
 * real entre invocaciones, no puede probarse con un mock fiel a la
 * garantía de atomicidad que SET NX realmente ofrece.
 */

const REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:55564';
const SECRET = 'test-onboarding-session-secret-do-not-use-in-prod';

const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

beforeAll(async () => {
  await redis.connect();
});

afterAll(async () => {
  redis.disconnect();
});

afterEach(async () => {
  await redis.flushdb();
});

describe('redeemInvitationToken — consumo de un solo uso respaldado por Redis', () => {
  it('el primer uso de un token válido se acepta', async () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const payload = await redeemInvitationToken({ token, secret: SECRET, redis });
    expect(payload.tenantId).toBe('tenant-a');
  });

  it('un segundo intento de usar el MISMO token se rechaza — no puede iniciar una segunda conexión independiente', async () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    await redeemInvitationToken({ token, secret: SECRET, redis });

    await expect(redeemInvitationToken({ token, secret: SECRET, redis })).rejects.toThrow(/already been used/i);
  });

  it('dos redenciones CONCURRENTES del mismo token — solo una gana, la otra falla (sin condición de carrera)', async () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);

    const results = await Promise.allSettled([
      redeemInvitationToken({ token, secret: SECRET, redis }),
      redeemInvitationToken({ token, secret: SECRET, redis }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it('tokens de invitación DISTINTOS para el mismo tenant se consumen de forma independiente', async () => {
    const tokenA = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const tokenB = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);

    await redeemInvitationToken({ token: tokenA, secret: SECRET, redis });
    // tokenB es un jti distinto — consumir tokenA no debe afectarlo.
    await expect(redeemInvitationToken({ token: tokenB, secret: SECRET, redis })).resolves.toMatchObject({ tenantId: 'tenant-a' });
  });

  it('un token expirado nunca llega a marcarse como consumido (falla en la verificación, antes de tocar Redis)', async () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a', ttlSeconds: 1 }, SECRET);
    const farFuture = Date.now() + 60_000;

    await expect(redeemInvitationToken({ token, secret: SECRET, redis, now: farFuture })).rejects.toThrow(InvitationTokenError);

    // El jti nunca se marcó consumido — confirmamos leyendo Redis directamente.
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    expect(await isJtiConsumed(redis, payload.jti)).toBe(false);
  });

  it('un token con firma inválida nunca llega a tocar Redis', async () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a' }, SECRET);
    const tampered = token.replace(/.$/, token.endsWith('a') ? 'b' : 'a');

    await expect(redeemInvitationToken({ token: tampered, secret: SECRET, redis })).rejects.toThrow(InvitationTokenError);

    const dbSize = await redis.dbsize();
    expect(dbSize).toBe(0);
  });

  it('tryConsumeJti con TTL <= 0 nunca marca como consumido (defensa adicional, no solo la capa de verificación)', async () => {
    const result = await tryConsumeJti(redis, 'some-jti-value-000000000000000000', 0);
    expect(result).toBe(false);
    expect(await isJtiConsumed(redis, 'some-jti-value-000000000000000000')).toBe(false);
  });

  it('el TTL de la marca de consumo en Redis nunca excede el tiempo de vida restante del token', async () => {
    const token = issueInvitationToken({ tenantId: 'tenant-a', adminUserId: 'admin-a', ttlSeconds: 100 }, SECRET);
    await redeemInvitationToken({ token, secret: SECRET, redis });

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    const ttl = await redis.ttl(`invitation-token-consumed:${payload.jti}`);

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(100);
  });
});
