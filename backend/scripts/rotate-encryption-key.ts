/**
 * CLI de rotación de META_TOKEN_ENCRYPTION_KEY. Deliberadamente toma las
 * claves de variables de entorno, NUNCA de argumentos de línea de comandos
 * (que quedan en el historial de shell / `ps`) — mismo principio que
 * scripts/bootstrap-db-roles.sh.
 *
 * Uso:
 *   OWNER_DATABASE_URL="..." \
 *   RUNTIME_DATABASE_URL="..." \
 *   OLD_META_TOKEN_ENCRYPTION_KEY="<64 hex chars>" \
 *   NEW_META_TOKEN_ENCRYPTION_KEY="<64 hex chars — genera con: openssl rand -hex 32>" \
 *   npx tsx scripts/rotate-encryption-key.ts
 *
 * Después de una rotación exitosa (credentialsRotated > 0, failedCredentialIds
 * vacío): actualiza META_TOKEN_ENCRYPTION_KEY al nuevo valor en el entorno
 * de despliegue y reinicia el backend. La clave vieja debe conservarse por
 * separado (ver ARCHITECTURE_DECISION.md, sección de gestión de claves)
 * hasta confirmar que el nuevo valor funciona en producción — no se
 * descarta en el mismo paso que se rota.
 */
import { PrismaClient } from '@prisma/client';
import { rotateEncryptionKey } from '../src/crypto/rotateKey.js';

function requireHexKey(envVarName: string): Buffer {
  const raw = process.env[envVarName];
  if (!raw) {
    throw new Error(`${envVarName} is not set.`);
  }
  if (!/^[A-Fa-f0-9]{64}$/.test(raw)) {
    throw new Error(`${envVarName} must be exactly 64 hex characters.`);
  }
  return Buffer.from(raw, 'hex');
}

function requireEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is not set.`);
  return raw;
}

async function main() {
  const oldKey = requireHexKey('OLD_META_TOKEN_ENCRYPTION_KEY');
  const newKey = requireHexKey('NEW_META_TOKEN_ENCRYPTION_KEY');
  const ownerUrl = requireEnv('OWNER_DATABASE_URL');
  const runtimeUrl = requireEnv('RUNTIME_DATABASE_URL');

  const ownerPrisma = new PrismaClient({ datasources: { db: { url: ownerUrl } } });
  const runtimePrisma = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });

  try {
    console.log('Starting encryption key rotation...');
    const result = await rotateEncryptionKey({ runtimePrisma, ownerPrisma, oldKey, newKey });

    console.log(`Tenants processed: ${result.tenantsProcessed}`);
    console.log(`Credentials rotated: ${result.credentialsRotated}`);

    if (result.failedCredentialIds.length > 0) {
      console.error(
        `${result.failedCredentialIds.length} credential(s) FAILED to decrypt with the old key and were NOT modified:`,
      );
      for (const id of result.failedCredentialIds) console.error(`  - ${id}`);
      console.error('Investigate these manually before considering the rotation complete.');
      process.exitCode = 1;
      return;
    }

    console.log('Rotation complete. Update META_TOKEN_ENCRYPTION_KEY in the deployment environment and restart the backend.');
  } finally {
    await ownerPrisma.$disconnect();
    await runtimePrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Rotation failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
