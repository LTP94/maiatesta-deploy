import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { scopeToTenant } from '../../src/tenancy/isolation.js';

/**
 * Prueba de aislamiento bajo concurrencia real — lo que las suites
 * anteriores (tenant-isolation.test.ts, row-level-security.test.ts) NO
 * probaban: todas esas corrían una operación a la vez. Aquí se fuerza
 * reutilización real de conexiones físicas del pool entre transacciones de
 * tenants distintos (connection_limit bajo + más operaciones concurrentes
 * que conexiones disponibles), exactamente el escenario que preocupa en
 * producción: varias solicitudes de clientes distintos usando el mismo pool
 * al mismo tiempo.
 *
 * Por qué esto es seguro por diseño, no por suerte: `TenantScope.withSession`
 * (src/tenancy/isolation.ts) usa `prisma.$transaction(...)`, que en Prisma
 * reserva una única conexión física para toda la duración del callback y
 * solo la devuelve al pool cuando el callback termina. `set_config(...,
 * true)` fijado al inicio de esa transacción es local a ELLA — Postgres lo
 * revierte automáticamente al hacer COMMIT/ROLLBACK, antes de que la
 * conexión physical vuelva al pool y pueda asignarse a otra transacción de
 * otro tenant. Esta suite no prueba una afirmación nueva sobre el diseño;
 * prueba que la implementación real, bajo carga real, se comporta como el
 * diseño predice.
 */

const OWNER_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';
const RUNTIME_URL = process.env.TEST_RUNTIME_DATABASE_URL;

// connection_limit bajo A PROPÓSITO — con 20+ operaciones concurrentes y
// solo 3 conexiones físicas, el pool garantiza reutilización cruzada entre
// tenants durante esta prueba, no la deja al azar.
const CONSTRAINED_RUNTIME_URL = RUNTIME_URL ? `${RUNTIME_URL}&connection_limit=3&pool_timeout=20` : undefined;

const owner = new PrismaClient({ datasources: { db: { url: OWNER_URL } } });
const runtime = CONSTRAINED_RUNTIME_URL
  ? new PrismaClient({ datasources: { db: { url: CONSTRAINED_RUNTIME_URL } } })
  : null;

const TENANT_COUNT = 12;
let tenants: { id: string; slug: string }[] = [];

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

  tenants = [];
  for (let i = 0; i < TENANT_COUNT; i += 1) {
    const tenant = await owner.tenant.create({ data: { name: `Concurrency Tenant ${i}`, slug: `concurrency-tenant-${i}` } });
    tenants.push(tenant);
    await owner.onboardingSession.create({
      data: {
        tenantId: tenant.id,
        adminUserId: `admin-${i}`,
        nonce: `concurrency-nonce-${i}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
  }
});

const describeIfRuntime = RUNTIME_URL ? describe : describe.skip;

describeIfRuntime('Aislamiento de tenant bajo concurrencia real (pool compartido, connection_limit=3)', () => {
  it('READ: N lecturas concurrentes de N tenants distintos nunca devuelven una fila de otro tenant', async () => {
    const results = await Promise.all(
      tenants.map((tenant) => scopeToTenant(runtime!, tenant.id).onboardingSessions().findMany()),
    );

    results.forEach((rows, index) => {
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tenantId).toBe(tenants[index]!.id);
    });
  });

  it('READ: disparado 3 veces en ráfaga (60 llamadas), la contaminación cruzada nunca aparece', async () => {
    for (let round = 0; round < 3; round += 1) {
      const results = await Promise.all(
        tenants.map((tenant) => scopeToTenant(runtime!, tenant.id).onboardingSessions().findMany()),
      );
      results.forEach((rows, index) => {
        expect(rows.every((r) => r.tenantId === tenants[index]!.id)).toBe(true);
      });
    }
  });

  it('CREATE: creaciones concurrentes de sesiones para tenants distintos aterrizan cada una en su propio tenant', async () => {
    const created = await Promise.all(
      tenants.map((tenant, index) =>
        scopeToTenant(runtime!, tenant.id)
          .onboardingSessions()
          .create({ adminUserId: `concurrent-admin-${index}`, nonce: `concurrent-create-${index}`, expiresAt: new Date(Date.now() + 60_000) }),
      ),
    );

    created.forEach((session, index) => {
      expect(session.tenantId).toBe(tenants[index]!.id);
    });

    // Verificación independiente vía el rol dueño (fuera del pool restringido)
    // de que ninguna sesión terminó bajo el tenant equivocado.
    for (const [index, tenant] of tenants.entries()) {
      const rows = await owner.onboardingSession.findMany({ where: { tenantId: tenant.id, nonce: `concurrent-create-${index}` } });
      expect(rows).toHaveLength(1);
    }
  });

  it('UPDATE: actualizaciones concurrentes de credenciales de tenants distintos nunca escriben en la fila de otro', async () => {
    const auths = await Promise.all(
      tenants.map((tenant, index) =>
        owner.metaAuthorization.create({
          data: {
            tenant: { connect: { id: tenant.id } },
            metaUserId: `concurrency-meta-user-${index}`,
            onboardingSession: {
              create: { tenantId: tenant.id, adminUserId: `admin-${index}`, nonce: `concurrency-upd-${index}`, expiresAt: new Date(Date.now() + 60_000) },
            },
          },
        }),
      ),
    );
    const credentials = await Promise.all(
      auths.map((auth) =>
        owner.credential.create({ data: { metaAuthorizationId: auth.id, kind: 'WHATSAPP_ACCESS_TOKEN', encryptedValue: 'iv.tag.original' } }),
      ),
    );

    await Promise.all(
      credentials.map((cred, index) =>
        scopeToTenant(runtime!, tenants[index]!.id).credentials().updateEncryptedValue(cred.id, `iv.tag.updated-by-tenant-${index}`),
      ),
    );

    for (const [index, cred] of credentials.entries()) {
      const row = await owner.credential.findUniqueOrThrow({ where: { id: cred.id } });
      expect(row.encryptedValue).toBe(`iv.tag.updated-by-tenant-${index}`);
    }
  });

  it('DELETE (vía cascade): eliminar la sesión de un tenant bajo concurrencia no afecta las sesiones de otros tenants', async () => {
    // TenantScope no expone un delete directo hoy (no hay caso de uso en
    // Etapa 1/2) — se prueba a través del owner pero DENTRO de una ráfaga
    // concurrente de lecturas con contexto de tenant fijado, para confirmar
    // que un DELETE intercalado no corrompe el contexto de las transacciones
    // de lectura que corren al mismo tiempo en otras conexiones del pool.
    const [deleteResult, ...readResults] = await Promise.all([
      owner.onboardingSession.delete({ where: { nonce: 'concurrency-nonce-0' } }),
      ...tenants.slice(1).map((tenant) => scopeToTenant(runtime!, tenant.id).onboardingSessions().findMany()),
    ]);

    expect(deleteResult).toBeDefined();
    readResults.forEach((rows, index) => {
      const tenant = tenants[index + 1]!;
      expect(rows.every((r) => r.tenantId === tenant.id)).toBe(true);
    });

    const remaining = await owner.onboardingSession.findMany({ where: { tenantId: tenants[0]!.id } });
    expect(remaining).toHaveLength(0);
  });

  it('FAIL-CLOSED bajo concurrencia: llamadas sin contexto de tenant intercaladas con llamadas correctamente scoped nunca ven filas ajenas ni las suyas por accidente', async () => {
    const scopedCalls = tenants.map((tenant) => scopeToTenant(runtime!, tenant.id).onboardingSessions().findMany());
    const unscopedCalls = Array.from({ length: TENANT_COUNT }, () => runtime!.$transaction((tx) => tx.onboardingSession.findMany()));

    const [scopedResults, unscopedResults] = await Promise.all([Promise.all(scopedCalls), Promise.all(unscopedCalls)]);

    scopedResults.forEach((rows, index) => {
      expect(rows.every((r) => r.tenantId === tenants[index]!.id)).toBe(true);
    });
    unscopedResults.forEach((rows) => {
      expect(rows).toHaveLength(0);
    });
  });
});
