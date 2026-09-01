/**
 * Strict, fail-closed loaders for the server-only env vars this Meta
 * integration depends on. Never log the raw env value, derived key
 * material, or any HMAC output.
 */

export class MetaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaConfigError';
  }
}

/**
 * META_PUBLIC_BASE_URL — the origin this deployment tells Meta about (e.g.
 * in the data-deletion status URL). Deliberately never derived from the
 * incoming request's Host/X-Forwarded-Host/URL, which are attacker- or
 * proxy-influenced and this value is handed back to a third party.
 */
export function getMetaPublicBaseUrl(): string {
  const raw = process.env.META_PUBLIC_BASE_URL;

  if (!raw) {
    throw new MetaConfigError('META_PUBLIC_BASE_URL is not configured.');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new MetaConfigError('META_PUBLIC_BASE_URL is not a valid URL.');
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    parsed.pathname !== '/'
  ) {
    throw new MetaConfigError('META_PUBLIC_BASE_URL must be a bare https origin.');
  }

  return parsed.origin;
}

const STATUS_KEY_HEX_PATTERN = /^[A-Fa-f0-9]{64}$/;

/**
 * META_DATA_DELETION_STATUS_SECRET — must be exactly 64 hex chars (32 bytes
 * / 256 bits), e.g. generated via `openssl rand -hex 32`. This exact-format
 * requirement applies only to our own status secret; META_APP_SECRET's
 * format is controlled by Meta, not us, and is never validated this way.
 */
export function getDataDeletionStatusKey(): Buffer {
  const raw = process.env.META_DATA_DELETION_STATUS_SECRET;

  if (!raw) {
    throw new MetaConfigError('META_DATA_DELETION_STATUS_SECRET is not configured.');
  }

  if (!STATUS_KEY_HEX_PATTERN.test(raw)) {
    throw new MetaConfigError('META_DATA_DELETION_STATUS_SECRET must be 64 hex characters.');
  }

  const key = Buffer.from(raw, 'hex');

  if (key.length !== 32) {
    throw new MetaConfigError('META_DATA_DELETION_STATUS_SECRET must decode to 32 bytes.');
  }

  return key;
}

/**
 * META_APP_SECRET — the real Meta App Secret. Format is controlled by Meta,
 * not validated beyond "present and non-empty".
 */
export function getMetaAppSecret(): string {
  const raw = process.env.META_APP_SECRET;

  if (!raw) {
    throw new MetaConfigError('META_APP_SECRET is not configured.');
  }

  return raw;
}
