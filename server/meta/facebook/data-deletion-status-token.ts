import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Opaque, signed token carried in the data-deletion status URL. Same
 * base64url(JSON) + '.' + base64url(HMAC-SHA256) shape as Meta's own
 * signed_request, keyed by a *separate* secret (META_DATA_DELETION_STATUS_SECRET)
 * so it can be rotated independently of META_APP_SECRET.
 *
 * Deliberately has no `createdAt`/timestamp field — a freshly-generated
 * timestamp on every issuance would make the token itself non-deterministic
 * even though confirmationCode is deterministic, which defeats the point:
 * the same signed_request must produce the same confirmationCode, the same
 * token, and the same status URL, every time, so Meta's retries are
 * provably idempotent even with zero database. Real timestamps belong on a
 * real deletion-request record once one exists — not invented here.
 */
export type DeletionStatusPayload = {
  v: 1;
  confirmationCode: string;
  status: 'completed';
};

const CONFIRMATION_CODE_PATTERN = /^[a-f0-9]{32}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function decodeBase64UrlStrict(segment: string): Buffer | null {
  if (segment.length === 0 || !BASE64URL_PATTERN.test(segment)) {
    return null;
  }

  return Buffer.from(segment, 'base64url');
}

function isValidPayload(value: unknown): value is DeletionStatusPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.v === 1 &&
    typeof candidate.confirmationCode === 'string' &&
    CONFIRMATION_CODE_PATTERN.test(candidate.confirmationCode) &&
    candidate.status === 'completed'
  );
}

export function issueStatusToken(payload: DeletionStatusPayload, key: Buffer): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', key).update(encodedPayload).digest('base64url');

  return `${signature}.${encodedPayload}`;
}

/**
 * Returns the validated payload, or null for any failure (bad shape, bad
 * base64url, signature mismatch, or a well-signed-but-wrong-schema
 * payload). The signature proves authenticity, not validity of contents —
 * both are required.
 */
export function verifyStatusToken(token: string, key: Buffer): DeletionStatusPayload | null {
  const parts = token.split('.');

  if (parts.length !== 2) {
    return null;
  }

  const [encodedSignature, encodedPayload] = parts;

  const providedSignature = decodeBase64UrlStrict(encodedSignature);
  if (!providedSignature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', key).update(encodedPayload).digest();

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  const decodedPayload = decodeBase64UrlStrict(encodedPayload);
  if (!decodedPayload) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decodedPayload.toString('utf8'));
  } catch {
    return null;
  }

  return isValidPayload(payload) ? payload : null;
}
