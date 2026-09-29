import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Aislamiento multiempresa en DOS capas independientes, no una:
 *
 * Capa 1 (aplicación) — cada método de `TenantScope` inyecta `tenantId` en
 * el `where` de la query, y el valor del scope siempre gana sobre cualquier
 * cosa que un llamador intente pasar.
 *
 * Capa 2 (base de datos) — cada operación corre dentro de una transacción
 * que primero fija `app.current_tenant_id` para esa transacción
 * (`set_config(..., true)` — equivalente a `SET LOCAL`, revertido
 * automáticamente al terminar la transacción). Las políticas de Row-Level
 * Security de Postgres (ver
 * prisma/migrations/20260929180000_enable_row_level_security) filtran por
 * esa misma variable de sesión — así que incluso una query cruda, sin
 * ningún `where`, ejecutada con el mismo rol `app_runtime`
 * (RUNTIME_DATABASE_URL, ver src/db/client.ts), devuelve solo las filas del
 * tenant activo, o CERO filas si nunca se fijó ninguno.
 *
 * Esto es exactamente la respuesta a "que el aislamiento no dependa
 * únicamente de que cada programador recuerde incluir un tenantId": un
 * desarrollador que en el futuro escriba `prisma.phoneNumber.findMany()`
 * directamente, sin pasar por TenantScope, SIGUE protegido por RLS siempre
 * que el proceso corra con RUNTIME_DATABASE_URL (que es la única URL que
 * este backend usa en runtime — ver src/db/client.ts, no expone la URL del
 * rol dueño). Ver tests/integration/row-level-security.test.ts para la
 * prueba directa de este escenario.
 */
export class TenantScope {
  constructor(
    private readonly prisma: PrismaClient,
    public readonly tenantId: string,
  ) {}

  /**
   * Ejecuta `fn` dentro de una transacción con `app.current_tenant_id` fijado
   * para el alcance de esa transacción únicamente — nunca se filtra a otras
   * conexiones ni a queries fuera de esta transacción.
   */
  private withSession<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${this.tenantId}, true)`;
      return fn(tx);
    });
  }

  // --- Tablas con tenantId directo ------------------------------------------

  onboardingSessions() {
    return {
      findMany: (args: Parameters<PrismaClient['onboardingSession']['findMany']>[0] = {}) =>
        this.withSession((tx) =>
          tx.onboardingSession.findMany({ ...args, where: { ...args?.where, tenantId: this.tenantId } }),
        ),
      findFirst: (args: Parameters<PrismaClient['onboardingSession']['findFirst']>[0] = {}) =>
        this.withSession((tx) =>
          tx.onboardingSession.findFirst({ ...args, where: { ...args?.where, tenantId: this.tenantId } }),
        ),
      create: (data: Omit<Prisma.OnboardingSessionUncheckedCreateInput, 'tenantId'>) =>
        this.withSession((tx) => tx.onboardingSession.create({ data: { ...data, tenantId: this.tenantId } })),
    };
  }

  metaAuthorizations() {
    return {
      findMany: (args: Parameters<PrismaClient['metaAuthorization']['findMany']>[0] = {}) =>
        this.withSession((tx) =>
          tx.metaAuthorization.findMany({ ...args, where: { ...args?.where, tenantId: this.tenantId } }),
        ),
      findFirst: (args: Parameters<PrismaClient['metaAuthorization']['findFirst']>[0] = {}) =>
        this.withSession((tx) =>
          tx.metaAuthorization.findFirst({ ...args, where: { ...args?.where, tenantId: this.tenantId } }),
        ),
    };
  }

  auditLogs() {
    return {
      findMany: (args: Parameters<PrismaClient['auditLog']['findMany']>[0] = {}) =>
        this.withSession((tx) =>
          tx.auditLog.findMany({ ...args, where: { ...args?.where, tenantId: this.tenantId } }),
        ),
      create: (action: string, metadata?: Record<string, unknown>, actor = 'system') =>
        this.withSession((tx) =>
          tx.auditLog.create({
            data: {
              tenantId: this.tenantId,
              actor,
              action,
              metadata: metadata as Prisma.InputJsonValue | undefined,
            },
          }),
        ),
    };
  }

  // --- Tablas alcanzadas por relación — el filtro atraviesa el join --------

  whatsappBusinessAccounts() {
    return {
      findMany: () =>
        this.withSession((tx) =>
          tx.whatsappBusinessAccount.findMany({
            where: { metaAuthorization: { tenantId: this.tenantId } },
          }),
        ),
    };
  }

  phoneNumbers() {
    return {
      findMany: () =>
        this.withSession((tx) =>
          tx.phoneNumber.findMany({
            where: { whatsappBusinessAccount: { metaAuthorization: { tenantId: this.tenantId } } },
          }),
        ),
      /**
       * Busca un número específico, PERO solo si pertenece a este tenant —
       * a diferencia de `prisma.phoneNumber.findUnique({ where: { id } })`,
       * que devolvería el número sin importar de quién es. Esta es
       * exactamente la operación que una prueba de fuga entre tenants debe
       * intentar explotar y confirmar que falla (ver
       * tests/integration/tenant-isolation.test.ts).
       */
      findByIdScoped: (phoneNumberRowId: string) =>
        this.withSession((tx) =>
          tx.phoneNumber.findFirst({
            where: {
              id: phoneNumberRowId,
              whatsappBusinessAccount: { metaAuthorization: { tenantId: this.tenantId } },
            },
          }),
        ),
    };
  }

  credentials() {
    return {
      findMany: () =>
        this.withSession((tx) =>
          tx.credential.findMany({
            where: { metaAuthorization: { tenantId: this.tenantId } },
          }),
        ),
      /**
       * Reemplaza el valor cifrado de una credencial — usado por la rotación
       * de clave (src/crypto/rotateKey.ts). `updateMany` (no `update`) porque
       * Prisma exige un `where` único para `update`, y aquí el filtro real
       * es "este id, Y que pertenezca a este tenant" — la combinación es lo
       * que impide que un tenantId incorrecto reescriba la credencial de otro.
       */
      updateEncryptedValue: (credentialId: string, newEncryptedValue: string) =>
        this.withSession((tx) =>
          tx.credential.updateMany({
            where: { id: credentialId, metaAuthorization: { tenantId: this.tenantId } },
            data: { encryptedValue: newEncryptedValue, rotatedAt: new Date() },
          }),
        ),
    };
  }
}

/**
 * Resuelve un TenantScope a partir de un tenantId ya autenticado/verificado.
 * Deliberadamente NO acepta un tenantId "porque sí" — el nombre del
 * parámetro documenta la obligación de quien llama.
 */
export function scopeToTenant(prisma: PrismaClient, verifiedTenantId: string): TenantScope {
  if (!verifiedTenantId) {
    throw new Error('scopeToTenant requires a verified tenantId — refusing to create an unscoped context.');
  }
  return new TenantScope(prisma, verifiedTenantId);
}
