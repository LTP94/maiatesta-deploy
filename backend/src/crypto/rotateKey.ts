import type { PrismaClient } from '@prisma/client';
import { decryptToken, encryptToken, TokenCipherError } from './tokenCipher.js';
import { scopeToTenant } from '../tenancy/isolation.js';

export class KeyRotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyRotationError';
  }
}

export type KeyRotationResult = {
  tenantsProcessed: number;
  credentialsRotated: number;
  /** Ids de credenciales que fallaron a descifrar con la clave vieja — no se tocan, se reportan. */
  failedCredentialIds: string[];
};

/**
 * Rota la clave de cifrado de TODAS las credenciales, tenant por tenant.
 *
 * Por qué tenant por tenant y no un UPDATE masivo: `runtimePrisma` se
 * conecta con el rol `app_runtime` (RLS activo) — un UPDATE sin acotar por
 * tenant simplemente no vería filas de otros tenants para actualizar
 * (RLS lo impediría), así que la única forma correcta de rotar TODO es
 * iterar tenant por tenant, usando el mismo `TenantScope` que usa el resto
 * de la aplicación — la rotación de claves no es una excepción al modelo de
 * aislamiento, lo respeta.
 *
 * `ownerPrisma` se usa ÚNICAMENTE para enumerar los ids de tenant — nunca
 * lee ni escribe una fila de `credentials` directamente. Esa distinción es
 * intencional: incluso una operación de mantenimiento como esta no obtiene
 * una vía de acceso directo a credenciales fuera del modelo de tenant scope.
 *
 * Si una credencial falla al descifrar con la clave vieja (dato corrupto,
 * clave vieja incorrecta), se deja SIN TOCAR y se reporta en
 * `failedCredentialIds` — nunca se sobreescribe una credencial que no se
 * pudo verificar, y nunca se aborta toda la rotación por una fila mala.
 */
export async function rotateEncryptionKey(params: {
  runtimePrisma: PrismaClient;
  ownerPrisma: PrismaClient;
  oldKey: Buffer;
  newKey: Buffer;
}): Promise<KeyRotationResult> {
  const { runtimePrisma, ownerPrisma, oldKey, newKey } = params;

  if (oldKey.equals(newKey)) {
    throw new KeyRotationError('New key must be different from the old key.');
  }

  const tenants = await ownerPrisma.tenant.findMany({ select: { id: true } });

  let credentialsRotated = 0;
  const failedCredentialIds: string[] = [];

  for (const tenant of tenants) {
    const scope = scopeToTenant(runtimePrisma, tenant.id);
    const credentials = await scope.credentials().findMany();

    for (const credential of credentials) {
      let plaintext: string;
      try {
        plaintext = decryptToken(credential.encryptedValue, oldKey);
      } catch (error) {
        if (error instanceof TokenCipherError) {
          failedCredentialIds.push(credential.id);
          continue;
        }
        throw error;
      }

      const reEncrypted = encryptToken(plaintext, newKey);
      await scope.credentials().updateEncryptedValue(credential.id, reEncrypted);
      credentialsRotated += 1;
    }
  }

  return { tenantsProcessed: tenants.length, credentialsRotated, failedCredentialIds };
}
