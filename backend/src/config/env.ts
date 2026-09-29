/**
 * Loaders de variables de entorno, fail-closed, en el mismo espíritu que
 * server/meta/config.ts del repositorio Vercel: nunca loguean el valor
 * crudo de un secreto, fallan con un mensaje que nombra SOLO la variable
 * faltante/malformada, nunca su valor.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function requireEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) {
    throw new ConfigError(`${name} is not configured.`);
  }
  return raw;
}

const HEX_64_PATTERN = /^[A-Fa-f0-9]{64}$/;

function requireHexKey(name: string): Buffer {
  const raw = requireEnv(name);
  if (!HEX_64_PATTERN.test(raw)) {
    throw new ConfigError(`${name} must be 64 hex characters (32 bytes / 256 bits).`);
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new ConfigError(`${name} must decode to 32 bytes.`);
  }
  return key;
}

export function getDatabaseUrl(): string {
  return requireEnv('DATABASE_URL');
}

/**
 * URL de conexión para el rol de aplicación `app_runtime` — NOBYPASSRLS, no
 * dueño de tablas (ver prisma/migrations/20260929180000_enable_row_level_security).
 * Es la URL que usa el servidor Express en runtime; DATABASE_URL (rol dueño)
 * solo la usan las migraciones.
 */
export function getRuntimeDatabaseUrl(): string {
  return requireEnv('RUNTIME_DATABASE_URL');
}

export function getRedisUrl(): string {
  return requireEnv('REDIS_URL');
}

export function getPort(): number {
  const raw = process.env.PORT ?? '4000';
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new ConfigError('PORT must be a valid TCP port number.');
  }
  return port;
}

/**
 * Orígenes permitidos para CORS. Fail-closed: si no está configurado, la
 * lista queda vacía (nada pasa CORS) en vez de caer a un valor permisivo.
 */
export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function getMetaAppId(): string {
  return requireEnv('META_APP_ID');
}

export function getMetaAppSecret(): string {
  return requireEnv('META_APP_SECRET');
}

const GRAPH_API_VERSION_PATTERN = /^v\d{2,3}\.0$/;

export function getMetaGraphApiVersion(): string {
  const raw = requireEnv('META_GRAPH_API_VERSION');
  if (!GRAPH_API_VERSION_PATTERN.test(raw)) {
    throw new ConfigError('META_GRAPH_API_VERSION must look like "v25.0".');
  }
  return raw;
}

export function getMetaWebhookVerifyToken(): string {
  return requireEnv('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN');
}

/**
 * Clave de cifrado para credenciales (Credential.encryptedValue). Deliberadamente
 * independiente de META_APP_SECRET — nunca se deriva de él (instrucción
 * explícita del pedido: "No reutilices indiscriminadamente el App Secret
 * como clave de cifrado").
 */
export function getTokenEncryptionKey(): Buffer {
  return requireHexKey('META_TOKEN_ENCRYPTION_KEY');
}

/** Clave separada para payloads de webhook con retención corta. */
export function getWebhookPayloadEncryptionKey(): Buffer {
  return requireHexKey('META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY');
}

export function getOnboardingSessionSecret(): string {
  return requireEnv('META_ONBOARDING_SESSION_SECRET');
}

/**
 * Firma los tokens de invitación (src/access/invitationToken.ts).
 * Deliberadamente independiente de META_ONBOARDING_SESSION_SECRET — son
 * primitivos distintos con ciclos de vida distintos (invitación: días;
 * sesión: minutos) y comprometer uno no debe comprometer el otro.
 */
export function getInvitationTokenSecret(): string {
  return requireEnv('META_INVITATION_TOKEN_SECRET');
}

/**
 * Credencial administrativa exigida para emitir tokens de invitación
 * (src/access/invitationToken.ts:issueInvitationTokenAsAdmin) — deliberadamente
 * independiente de META_ONBOARDING_SESSION_SECRET (esa firma el token; esta
 * autoriza a quien lo pide). Sin esto, cualquier código con acceso al
 * proceso podría emitir un token válido para cualquier tenant.
 */
export function getAdminApiKey(): string {
  return requireEnv('ADMIN_API_KEY');
}
