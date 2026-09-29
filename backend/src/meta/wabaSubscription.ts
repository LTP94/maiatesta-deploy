import type { PrismaClient } from '@prisma/client';
import { decryptToken } from '../crypto/tokenCipher.js';
import { TenantScope } from '../tenancy/isolation.js';
import type { MetaGraphClient } from './graphClient.js';

export class WabaSubscriptionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

/** Preparado para Graph simulado; no se invoca automáticamente en producción. */
export async function ensureWabaSubscription(params: {
  prisma: PrismaClient;
  tenantId: string;
  wabaId: string;
  graphClient: MetaGraphClient;
  encryptionKey: Buffer;
}): Promise<'ALREADY_SUBSCRIBED' | 'SUBSCRIBED'> {
  const scope = new TenantScope(params.prisma, params.tenantId);
  const context = await scope.whatsappBusinessAccounts().findSubscriptionContext(params.wabaId);
  const credential = context?.metaAuthorization.credentials[0];
  if (!context || !credential) throw new WabaSubscriptionError('INVALID_WABA_AUTHORIZATION', 'WABA is not active for this tenant.');

  const accessToken = decryptToken(credential.encryptedValue, params.encryptionKey);
  const subscribedApps = await params.graphClient.getSubscribedApps(params.wabaId, accessToken);
  const checkedAt = new Date();
  if (subscribedApps.includes(params.graphClient.applicationId)) {
    await scope.webhookSubscriptions().upsert(params.wabaId, 'SUBSCRIBED', { checkedAt });
    return 'ALREADY_SUBSCRIBED';
  }

  await params.graphClient.subscribeAppToWaba(params.wabaId, accessToken);
  await scope.webhookSubscriptions().upsert(params.wabaId, 'SUBSCRIBED', { checkedAt, subscribedAt: new Date(), lastErrorCode: null });
  return 'SUBSCRIBED';
}
