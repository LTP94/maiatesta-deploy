import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Aislamiento multiempresa como defecto estructural, no como una casilla que
 * un desarrollador puede olvidar marcar.
 *
 * Regla: cualquier código que necesite leer/escribir datos de un tenant debe
 * pasar por un `TenantScope`, nunca por el PrismaClient crudo directamente
 * para estas tablas. Un `TenantScope` se construye con un tenantId ya
 * VERIFICADO (nunca un valor que llegó tal cual desde el navegador — ver
 * onboarding/service.ts en la Etapa 2, que resuelve el tenantId a partir del
 * nonce de sesión firmado, no de un campo del body) y cada método inyecta
 * `tenantId` en el `where` de la query — no hay ningún método en esta clase
 * que permita una query sin ese filtro.
 *
 * Para las tablas que no tienen tenantId como columna directa (WABA, número,
 * credencial, config de integración, evento de mensaje), el filtro atraviesa
 * la relación real hasta el tenant — nunca se confía en un id de esas tablas
 * por sí solo, exactamente el mismo principio que pide la sección 7 del
 * pedido para el modelo de datos.
 */
export class TenantScope {
  constructor(
    private readonly prisma: PrismaClient,
    public readonly tenantId: string,
  ) {}

  // --- Tablas con tenantId directo ------------------------------------------

  onboardingSessions() {
    return {
      findMany: (args: Parameters<PrismaClient['onboardingSession']['findMany']>[0] = {}) =>
        this.prisma.onboardingSession.findMany({
          ...args,
          where: { ...args?.where, tenantId: this.tenantId },
        }),
      findFirst: (args: Parameters<PrismaClient['onboardingSession']['findFirst']>[0] = {}) =>
        this.prisma.onboardingSession.findFirst({
          ...args,
          where: { ...args?.where, tenantId: this.tenantId },
        }),
      create: (data: Omit<Prisma.OnboardingSessionUncheckedCreateInput, 'tenantId'>) =>
        this.prisma.onboardingSession.create({ data: { ...data, tenantId: this.tenantId } }),
    };
  }

  metaAuthorizations() {
    return {
      findMany: (args: Parameters<PrismaClient['metaAuthorization']['findMany']>[0] = {}) =>
        this.prisma.metaAuthorization.findMany({
          ...args,
          where: { ...args?.where, tenantId: this.tenantId },
        }),
      findFirst: (args: Parameters<PrismaClient['metaAuthorization']['findFirst']>[0] = {}) =>
        this.prisma.metaAuthorization.findFirst({
          ...args,
          where: { ...args?.where, tenantId: this.tenantId },
        }),
    };
  }

  auditLogs() {
    return {
      findMany: (args: Parameters<PrismaClient['auditLog']['findMany']>[0] = {}) =>
        this.prisma.auditLog.findMany({
          ...args,
          where: { ...args?.where, tenantId: this.tenantId },
        }),
      create: (action: string, metadata?: Record<string, unknown>, actor = 'system') =>
        this.prisma.auditLog.create({
          data: {
            tenantId: this.tenantId,
            actor,
            action,
            metadata: metadata as Prisma.InputJsonValue | undefined,
          },
        }),
    };
  }

  // --- Tablas alcanzadas por relación — el filtro atraviesa el join --------

  whatsappBusinessAccounts() {
    return {
      findMany: () =>
        this.prisma.whatsappBusinessAccount.findMany({
          where: { metaAuthorization: { tenantId: this.tenantId } },
        }),
    };
  }

  phoneNumbers() {
    return {
      findMany: () =>
        this.prisma.phoneNumber.findMany({
          where: { whatsappBusinessAccount: { metaAuthorization: { tenantId: this.tenantId } } },
        }),
      /**
       * Busca un número específico, PERO solo si pertenece a este tenant —
       * a diferencia de `prisma.phoneNumber.findUnique({ where: { id } })`,
       * que devolvería el número sin importar de quién es. Esta es
       * exactamente la operación que una prueba de fuga entre tenants debe
       * intentar explotar y confirmar que falla (ver
       * tests/integration/tenant-isolation.test.ts).
       */
      findByIdScoped: (phoneNumberRowId: string) =>
        this.prisma.phoneNumber.findFirst({
          where: {
            id: phoneNumberRowId,
            whatsappBusinessAccount: { metaAuthorization: { tenantId: this.tenantId } },
          },
        }),
    };
  }

  credentials() {
    return {
      findMany: () =>
        this.prisma.credential.findMany({
          where: { metaAuthorization: { tenantId: this.tenantId } },
        }),
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
