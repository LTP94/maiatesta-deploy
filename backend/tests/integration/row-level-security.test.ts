import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient, type Prisma } from '@prisma/client';

/**
 * Prueba de Row-Level Security — la respuesta directa a "demuestra que el
 * aislamiento no depende únicamente de que cada programador recuerde
 * incluir un tenantId". Esta suite NO usa TenantScope en ningún momento —
 * deliberadamente lo evita, para simular exactamente el escenario que
 * TenantScope no puede prevenir por sí solo: un desarrollador (o un bug)
 * que escribe una query cruda sin ningún `where`.
 *
 * Dos conexiones separadas:
 *  - `owner` — el rol dueño de las tablas (TEST_DATABASE_URL), usado SOLO
 *    para el setup de datos (igual que lo haría una migración o un script
 *    administrativo). El dueño ignora RLS por diseño de Postgres.
 *  - `runtime` — el rol `app_runtime` (TEST_RUNTIME_DATABASE_URL), el mismo
 *    que usa el servidor Express en producción. NOBYPASSRLS. Todas las
 *    aserciones de esta suite corren contra esta conexión.
 *
 * Cada aserción fija `app.current_tenant_id` y hace la query cruda DENTRO
 * de la MISMA transacción (`$transaction`) — necesario porque
 * `set_config(..., true)` es por-transacción, y el pool de conexiones de
 * Prisma no garantiza que dos llamadas top-level separadas reutilicen la
 * misma conexión física. Esto es exactamente el mismo patrón que usa
 * `TenantScope.withSession` en producción (src/tenancy/isolation.ts) — la
 * prueba reproduce fielmente cómo se comporta el sistema real, no un atajo.
 */

const OWNER_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://maiatesta_test:test_only_password_never_use_in_prod@localhost:55563/maiatesta_whatsapp_test?schema=public';

const RUNTIME_URL = process.env.TEST_RUNTIME_DATABASE_URL;

const owner = new PrismaClient({ datasources: { db: { url: OWNER_URL } } });
const runtime = RUNTIME_URL ? new PrismaClient({ datasources: { db: { url: RUNTIME_URL } } }) : null;

/** Fija el tenant y ejecuta `fn` dentro de la misma transacción — ver nota arriba. */
async function asTenant<T>(tenantId: string | null, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return runtime!.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId ?? ''}, true)`;
    return fn(tx);
  });
}

let tenantA: { id: string };
let tenantB: { id: string };

beforeAll(async () => {
  await owner.$connect();
  if (runtime) await runtime.$connect();
});

afterAll(async () => {
  await owner.$disconnect();
  if (runtime) await runtime.$disconnect();
});

beforeEach(async () => {
  await owner.messageEvent.deleteMany();
  await owner.integrationConfig.deleteMany();
  await owner.credential.deleteMany();
  await owner.phoneNumber.deleteMany();
  await owner.whatsappBusinessAccount.deleteMany();
  await owner.metaAuthorization.deleteMany();
  await owner.onboardingSession.deleteMany();
  await owner.auditLog.deleteMany();
  await owner.adminUser.deleteMany();
  await owner.tenant.deleteMany();

  tenantA = await owner.tenant.create({ data: { name: 'RLS Tenant A', slug: 'rls-tenant-a' } });
  tenantB = await owner.tenant.create({ data: { name: 'RLS Tenant B', slug: 'rls-tenant-b' } });

  await owner.onboardingSession.create({
    data: { tenantId: tenantA.id, adminUserId: 'admin-a', nonce: 'rls-nonce-a', expiresAt: new Date(Date.now() + 60_000) },
  });
  await owner.onboardingSession.create({
    data: { tenantId: tenantB.id, adminUserId: 'admin-b', nonce: 'rls-nonce-b', expiresAt: new Date(Date.now() + 60_000) },
  });
});

const describeIfRuntime = RUNTIME_URL ? describe : describe.skip;

describeIfRuntime('Row-Level Security — el rol app_runtime, sin pasar por TenantScope', () => {
  it('con app.current_tenant_id sin fijar, una query cruda no devuelve NADA (fail-closed)', async () => {
    const rows = await runtime!.$transaction((tx) => tx.onboardingSession.findMany());
    expect(rows).toHaveLength(0);
  });

  it('fijando el tenant A, una query cruda (sin where) devuelve solo las filas de A', async () => {
    const rows = await asTenant(tenantA.id, (tx) => tx.onboardingSession.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tenantId).toBe(tenantA.id);
  });

  it('fijando el tenant B, la MISMA query cruda devuelve solo las filas de B — nunca las de A', async () => {
    const rows = await asTenant(tenantB.id, (tx) => tx.onboardingSession.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tenantId).toBe(tenantB.id);
  });

  it('un WHERE que pide explícitamente el otro tenant NO puede burlar RLS', async () => {
    // El atacante conoce el id de B y lo pide directamente estando
    // autenticado como A — RLS se aplica DESPUÉS de cualquier WHERE de la
    // aplicación, no en su lugar.
    const rows = await asTenant(tenantA.id, (tx) => tx.onboardingSession.findMany({ where: { tenantId: tenantB.id } }));
    expect(rows).toHaveLength(0);
  });

  it('protege también las tablas alcanzadas solo por relación (phone_numbers vía WABA vía autorización)', async () => {
    const authA = await owner.metaAuthorization.create({
      data: {
        tenant: { connect: { id: tenantA.id } },
        metaUserId: 'rls-meta-user-a',
        onboardingSession: {
          create: { tenantId: tenantA.id, adminUserId: 'admin-a', nonce: 'rls-nonce-a-phone', expiresAt: new Date(Date.now() + 60_000) },
        },
      },
    });
    const authB = await owner.metaAuthorization.create({
      data: {
        tenant: { connect: { id: tenantB.id } },
        metaUserId: 'rls-meta-user-b',
        onboardingSession: {
          create: { tenantId: tenantB.id, adminUserId: 'admin-b', nonce: 'rls-nonce-b-phone', expiresAt: new Date(Date.now() + 60_000) },
        },
      },
    });
    const wabaA = await owner.whatsappBusinessAccount.create({ data: { metaAuthorizationId: authA.id, wabaId: 'rls-waba-a' } });
    const wabaB = await owner.whatsappBusinessAccount.create({ data: { metaAuthorizationId: authB.id, wabaId: 'rls-waba-b' } });
    await owner.phoneNumber.create({ data: { whatsappBusinessAccountId: wabaA.id, phoneNumberId: 'rls-phone-a' } });
    await owner.phoneNumber.create({ data: { whatsappBusinessAccountId: wabaB.id, phoneNumberId: 'rls-phone-b' } });

    // Consulta cruda a phone_numbers — CERO relación explícita a tenant en
    // el where, exactamente el patrón que un desarrollador sin cuidado
    // escribiría.
    const rows = await asTenant(tenantA.id, (tx) => tx.phoneNumber.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.phoneNumberId).toBe('rls-phone-a');
  });

  it('el rol app_runtime NO puede alterar el esquema (solo DML, no DDL)', async () => {
    await expect(runtime!.$executeRawUnsafe('ALTER TABLE tenants ADD COLUMN hacked TEXT')).rejects.toThrow();
  });

  it('el rol app_runtime NO puede hacer TRUNCATE', async () => {
    await expect(runtime!.$executeRawUnsafe('TRUNCATE tenants CASCADE')).rejects.toThrow();
  });
});

if (!RUNTIME_URL) {
  describe('Row-Level Security', () => {
    it.skip('TEST_RUNTIME_DATABASE_URL no está definida — ver README para bootstrap-db-roles.sh', () => {});
  });
}
