import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { scopeToTenant, TenantScope } from '../../src/tenancy/isolation.js';

/**
 * Prueba de aislamiento multiempresa (sección 7 del pedido: "Prueba el
 * aislamiento entre clientes utilizando por lo menos dos clientes
 * ficticios"). Corre contra el Postgres de PRUEBAS Dockerizado
 * (docker-compose.test.yml), nunca contra el de desarrollo ni, por
 * supuesto, contra nada real.
 *
 * Requiere: `npm run docker:test:up` antes de correr esta suite (o el
 * comando combinado en package.json/README que levanta y corre todo).
 */

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';

const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });

let tenantA: { id: string };
let tenantB: { id: string };
let scopeA: TenantScope;
let scopeB: TenantScope;

/**
 * Crea una MetaAuthorization + OnboardingSession asociada en un solo paso.
 * Usa `tenant: { connect }` (no el scalar `tenantId`) porque Prisma exige
 * la forma "checked" de relación cuando la misma llamada también anida un
 * `onboardingSession.create` — detalle de tipado de Prisma, no una regla de
 * negocio; el resultado final en la base de datos es idéntico.
 */
async function createMetaAuthorization(params: {
  tenantId: string;
  metaUserId: string;
  adminUserId: string;
  nonce: string;
}) {
  return prisma.metaAuthorization.create({
    data: {
      tenant: { connect: { id: params.tenantId } },
      metaUserId: params.metaUserId,
      onboardingSession: {
        create: {
          tenantId: params.tenantId,
          adminUserId: params.adminUserId,
          nonce: params.nonce,
          expiresAt: new Date(Date.now() + 60_000),
        },
      },
    },
  });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Limpieza total entre pruebas — orden respeta las foreign keys.
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

  tenantA = await prisma.tenant.create({ data: { name: 'Cliente Ficticio A', slug: 'cliente-ficticio-a' } });
  tenantB = await prisma.tenant.create({ data: { name: 'Cliente Ficticio B', slug: 'cliente-ficticio-b' } });

  scopeA = scopeToTenant(prisma, tenantA.id);
  scopeB = scopeToTenant(prisma, tenantB.id);
});

describe('TenantScope — aislamiento entre dos tenants ficticios', () => {
  it('scopeToTenant rechaza crear un contexto sin tenantId verificado', () => {
    expect(() => scopeToTenant(prisma, '')).toThrow(/verified tenantId/);
  });

  it('onboardingSessions().create() asocia la sesión al tenant del scope, no a uno enviado por el llamador', async () => {
    const session = await scopeA.onboardingSessions().create({
      adminUserId: 'admin-1',
      nonce: 'nonce-a-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(session.tenantId).toBe(tenantA.id);
  });

  it('onboardingSessions().findMany() de tenant A nunca devuelve sesiones de tenant B', async () => {
    await scopeA.onboardingSessions().create({
      adminUserId: 'admin-a',
      nonce: 'nonce-a',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await scopeB.onboardingSessions().create({
      adminUserId: 'admin-b',
      nonce: 'nonce-b',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const sessionsA = await scopeA.onboardingSessions().findMany();
    const sessionsB = await scopeB.onboardingSessions().findMany();

    expect(sessionsA).toHaveLength(1);
    expect(sessionsA[0]?.tenantId).toBe(tenantA.id);
    expect(sessionsB).toHaveLength(1);
    expect(sessionsB[0]?.tenantId).toBe(tenantB.id);
  });

  it('un tenantId más ancho inyectado en el where del llamador NO puede ampliar el alcance (el scope siempre gana)', async () => {
    await scopeA.onboardingSessions().create({
      adminUserId: 'admin-a',
      nonce: 'nonce-a-wide',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await scopeB.onboardingSessions().create({
      adminUserId: 'admin-b',
      nonce: 'nonce-b-wide',
      expiresAt: new Date(Date.now() + 60_000),
    });

    // Intento de fuga: un llamador comprometido pasa un `where.tenantId`
    // distinto al del scope, esperando que se use el suyo. La implementación
    // de TenantScope pone `tenantId: this.tenantId` DESPUÉS del spread de
    // `args.where`, así que el valor del scope siempre gana.
    const attackerAttempt = await scopeA.onboardingSessions().findMany({
      // @ts-expect-error — construido deliberadamente para simular una fuga
      where: { tenantId: tenantB.id },
    });

    expect(attackerAttempt.every((s) => s.tenantId === tenantA.id)).toBe(true);
  });

  it('phoneNumbers().findByIdScoped() no puede leer un número de otro tenant por su id', async () => {
    const authA = await createMetaAuthorization({
      tenantId: tenantA.id,
      metaUserId: 'meta-user-a',
      adminUserId: 'admin-a',
      nonce: 'nonce-a-waba',
    });
    const wabaA = await prisma.whatsappBusinessAccount.create({
      data: { metaAuthorizationId: authA.id, wabaId: 'waba-a-001' },
    });
    const phoneA = await prisma.phoneNumber.create({
      data: { whatsappBusinessAccountId: wabaA.id, phoneNumberId: 'phone-a-001' },
    });

    // Tenant B intenta leer el número de Tenant A por su id de fila — el
    // ataque más directo posible de "acceso cruzado entre clientes"
    // (sección 12/14D del pedido).
    const leaked = await scopeB.phoneNumbers().findByIdScoped(phoneA.id);
    expect(leaked).toBeNull();

    // Tenant A sí puede leer su propio número.
    const own = await scopeA.phoneNumbers().findByIdScoped(phoneA.id);
    expect(own?.id).toBe(phoneA.id);
  });

  it('phoneNumberId es único a nivel de base de datos — un número no puede asociarse a dos WABAs/tenants distintos', async () => {
    const authA = await createMetaAuthorization({
      tenantId: tenantA.id,
      metaUserId: 'meta-user-a-2',
      adminUserId: 'admin-a',
      nonce: 'nonce-a-dup',
    });
    const authB = await createMetaAuthorization({
      tenantId: tenantB.id,
      metaUserId: 'meta-user-b-2',
      adminUserId: 'admin-b',
      nonce: 'nonce-b-dup',
    });
    const wabaA = await prisma.whatsappBusinessAccount.create({
      data: { metaAuthorizationId: authA.id, wabaId: 'waba-a-dup-test' },
    });
    const wabaB = await prisma.whatsappBusinessAccount.create({
      data: { metaAuthorizationId: authB.id, wabaId: 'waba-b-dup-test' },
    });

    await prisma.phoneNumber.create({
      data: { whatsappBusinessAccountId: wabaA.id, phoneNumberId: 'shared-phone-001' },
    });

    // El mismo phoneNumberId de Meta, ahora bajo el WABA de otro tenant —
    // esto es exactamente el escenario "número ya conectado en otro tenant"
    // que onboarding/complete (Etapa 2) deberá rechazar ANTES de intentar
    // este insert; aquí probamos que la base de datos lo rechaza incluso si
    // la capa de aplicación tuviera un bug.
    await expect(
      prisma.phoneNumber.create({
        data: { whatsappBusinessAccountId: wabaB.id, phoneNumberId: 'shared-phone-001' },
      }),
    ).rejects.toThrow();
  });

  it('credentials().findMany() de un tenant nunca incluye credenciales de otro', async () => {
    const authA = await createMetaAuthorization({
      tenantId: tenantA.id,
      metaUserId: 'meta-user-a-cred',
      adminUserId: 'admin-a',
      nonce: 'nonce-a-cred',
    });
    const authB = await createMetaAuthorization({
      tenantId: tenantB.id,
      metaUserId: 'meta-user-b-cred',
      adminUserId: 'admin-b',
      nonce: 'nonce-b-cred',
    });
    await prisma.credential.create({
      data: { metaAuthorizationId: authA.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: 'iv.tag.ciphertext-a' },
    });
    await prisma.credential.create({
      data: { metaAuthorizationId: authB.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: 'iv.tag.ciphertext-b' },
    });

    const credsA = await scopeA.credentials().findMany();
    expect(credsA).toHaveLength(1);
    expect(credsA[0]?.encryptedValue).toBe('iv.tag.ciphertext-a');
  });

  it('auditLogs() está scoped y nunca guarda tokens/códigos en metadata (contrato, no solo confirmación de tipo)', async () => {
    await scopeA.auditLogs().create('onboarding.started', { onboardingSessionId: 'abc-123' });
    await scopeB.auditLogs().create('onboarding.started', { onboardingSessionId: 'xyz-789' });

    const logsA = await scopeA.auditLogs().findMany();
    expect(logsA).toHaveLength(1);
    expect(logsA[0]?.tenantId).toBe(tenantA.id);

    const serialized = JSON.stringify(logsA[0]?.metadata);
    expect(serialized).not.toMatch(/token|code|secret/i);
  });

  it('AdminUser: el mismo email puede administrar dos tenants distintos (agencia con varios clientes)', async () => {
    const email = 'agencia@example.com';
    const adminA = await prisma.adminUser.create({ data: { tenantId: tenantA.id, email } });
    const adminB = await prisma.adminUser.create({ data: { tenantId: tenantB.id, email } });

    expect(adminA.tenantId).not.toBe(adminB.tenantId);

    // Pero el mismo email NO puede duplicarse dentro del MISMO tenant.
    await expect(prisma.adminUser.create({ data: { tenantId: tenantA.id, email } })).rejects.toThrow();
  });
});
