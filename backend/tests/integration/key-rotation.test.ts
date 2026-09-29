import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { decryptToken, encryptToken } from '../../src/crypto/tokenCipher.js';
import { KeyRotationError, rotateEncryptionKey } from '../../src/crypto/rotateKey.js';

const OWNER_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';
const RUNTIME_URL = process.env.TEST_RUNTIME_DATABASE_URL;

const owner = new PrismaClient({ datasources: { db: { url: OWNER_URL } } });
const runtime = RUNTIME_URL ? new PrismaClient({ datasources: { db: { url: RUNTIME_URL } } }) : null;

const OLD_KEY = randomBytes(32);
const NEW_KEY = randomBytes(32);

let tenantA: { id: string };
let tenantB: { id: string };
let authA: { id: string };
let authB: { id: string };

beforeAll(async () => {
  await owner.$connect();
  if (runtime) await runtime.$connect();
});

afterAll(async () => {
  await owner.$disconnect();
  if (runtime) await runtime.$disconnect();
});

beforeEach(async () => {
  await owner.credential.deleteMany();
  await owner.metaAuthorization.deleteMany();
  await owner.onboardingSession.deleteMany();
  await owner.tenant.deleteMany();

  tenantA = await owner.tenant.create({ data: { name: 'Rotation Tenant A', slug: 'rotation-tenant-a' } });
  tenantB = await owner.tenant.create({ data: { name: 'Rotation Tenant B', slug: 'rotation-tenant-b' } });

  authA = await owner.metaAuthorization.create({
    data: {
      tenant: { connect: { id: tenantA.id } },
      metaUserId: 'rotation-meta-user-a',
      onboardingSession: {
        create: { tenantId: tenantA.id, adminUserId: 'admin-a', nonce: 'rotation-nonce-a', expiresAt: new Date(Date.now() + 60_000) },
      },
    },
  });
  authB = await owner.metaAuthorization.create({
    data: {
      tenant: { connect: { id: tenantB.id } },
      metaUserId: 'rotation-meta-user-b',
      onboardingSession: {
        create: { tenantId: tenantB.id, adminUserId: 'admin-b', nonce: 'rotation-nonce-b', expiresAt: new Date(Date.now() + 60_000) },
      },
    },
  });
});

const describeIfRuntime = RUNTIME_URL ? describe : describe.skip;

describeIfRuntime('rotateEncryptionKey', () => {
  it('re-encrypts every credential across every tenant with the new key, decryptable only with the new key', async () => {
    await owner.credential.create({
      data: { metaAuthorizationId: authA.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: encryptToken('token-a-value', OLD_KEY) },
    });
    await owner.credential.create({
      data: { metaAuthorizationId: authB.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: encryptToken('token-b-value', OLD_KEY) },
    });

    const result = await rotateEncryptionKey({ runtimePrisma: runtime!, ownerPrisma: owner, oldKey: OLD_KEY, newKey: NEW_KEY });

    expect(result.tenantsProcessed).toBe(2);
    expect(result.credentialsRotated).toBe(2);
    expect(result.failedCredentialIds).toHaveLength(0);

    const rotatedA = await owner.credential.findFirstOrThrow({ where: { metaAuthorizationId: authA.id } });
    const rotatedB = await owner.credential.findFirstOrThrow({ where: { metaAuthorizationId: authB.id } });

    expect(decryptToken(rotatedA.encryptedValue, NEW_KEY)).toBe('token-a-value');
    expect(decryptToken(rotatedB.encryptedValue, NEW_KEY)).toBe('token-b-value');

    // La clave vieja ya no descifra el valor almacenado — prueba de que
    // realmente se reemplazó el ciphertext, no que simplemente "también
    // funciona" con ambas claves.
    expect(() => decryptToken(rotatedA.encryptedValue, OLD_KEY)).toThrow();
  });

  it('never mixes credentials between tenants during rotation', async () => {
    await owner.credential.create({
      data: { metaAuthorizationId: authA.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: encryptToken('only-a', OLD_KEY) },
    });

    await rotateEncryptionKey({ runtimePrisma: runtime!, ownerPrisma: owner, oldKey: OLD_KEY, newKey: NEW_KEY });

    const credsB = await owner.credential.findMany({ where: { metaAuthorizationId: authB.id } });
    expect(credsB).toHaveLength(0);
  });

  it('reports (not throws on) a credential that fails to decrypt with the old key, leaving it untouched', async () => {
    const corrupted = await owner.credential.create({
      data: { metaAuthorizationId: authA.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: 'not.a.validtoken' },
    });
    await owner.credential.create({
      data: { metaAuthorizationId: authB.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: encryptToken('good-token', OLD_KEY) },
    });

    const result = await rotateEncryptionKey({ runtimePrisma: runtime!, ownerPrisma: owner, oldKey: OLD_KEY, newKey: NEW_KEY });

    expect(result.failedCredentialIds).toEqual([corrupted.id]);
    expect(result.credentialsRotated).toBe(1);

    const stillCorrupted = await owner.credential.findUniqueOrThrow({ where: { id: corrupted.id } });
    expect(stillCorrupted.encryptedValue).toBe('not.a.validtoken');
  });

  it('rejects rotating to the same key', async () => {
    await expect(
      rotateEncryptionKey({ runtimePrisma: runtime!, ownerPrisma: owner, oldKey: OLD_KEY, newKey: OLD_KEY }),
    ).rejects.toThrow(KeyRotationError);
  });

  it('handles zero tenants / zero credentials without error', async () => {
    await owner.credential.deleteMany();
    const result = await rotateEncryptionKey({ runtimePrisma: runtime!, ownerPrisma: owner, oldKey: OLD_KEY, newKey: NEW_KEY });
    expect(result.credentialsRotated).toBe(0);
    expect(result.failedCredentialIds).toHaveLength(0);
  });
});
