import type { PrismaClient } from '@prisma/client';
import type { EventRouting } from './classify.js';

export type RouteResolution = {
  tenantId: string | null;
  phoneRowId: string | null;
  resultCode: 'ROUTED' | 'ROUTED_ADMIN' | 'UNKNOWN_WABA' | 'PHONE_MISMATCH_OR_INACTIVE' | 'INACTIVE_AUTHORIZATION';
};

/**
 * La función SQL solo revela la ruta solicitada. app_runtime no puede leer
 * ni enumerar waba_routes y la función valida autorización, WABA y número
 * dentro del mismo tenant antes de devolver una fila interna.
 */
export async function resolveWebhookRoute(
  prisma: PrismaClient,
  wabaId: string,
  routing: EventRouting,
): Promise<RouteResolution> {
  const routingValue = routing.kind === 'unroutable' ? '' : routing.value;
  const rows = await prisma.$queryRawUnsafe<Array<{ tenantId: string | null; phoneRowId: string | null; resultCode: RouteResolution['resultCode'] }>>(
    'SELECT * FROM resolve_webhook_route($1, $2, $3)',
    wabaId,
    routing.kind,
    routingValue,
  );
  return rows[0] ?? { tenantId: null, phoneRowId: null, resultCode: 'UNKNOWN_WABA' };
}
