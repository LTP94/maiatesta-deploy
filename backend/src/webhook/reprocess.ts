import type { PrismaClient } from '@prisma/client';
import { TenantScope } from '../tenancy/isolation.js';

/**
 * Reencola un evento dentro del tenant ya autenticado. No acepta ni modifica
 * tenantId almacenado; una combinación tenant/evento cruzada actualiza 0 filas.
 */
export async function reprocessWebhookEvent(prisma: PrismaClient, tenantId: string, eventId: string): Promise<boolean> {
  const result = await new TenantScope(prisma, tenantId).messageEvents().reprocess(eventId);
  return result.count === 1;
}
