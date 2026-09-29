import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Token de sesión de onboarding — el backend lo emite a sí mismo al crear
 * una `OnboardingSession` (Etapa 2) y se lo entrega al frontend como
 * identificador de esa sesión para `/onboarding/session` y
 * `/onboarding/complete`.
 *
 * Por qué existe en vez de simplemente devolver `OnboardingSession.nonce`
 * tal cual: `nonce` es único en la base de datos, pero para RESOLVER a qué
 * tenant pertenece un nonce haría falta una consulta sin contexto de tenant
 * fijado — exactamente lo que Row-Level Security bloquea por diseño (fail
 * closed, ver migración enable_row_level_security). Envolver `{tenantId,
 * nonce}` en un token firmado permite que cada request subsiguiente
 * verifique la firma y obtenga el `tenantId` de forma criptográfica, sin
 * necesitar nunca una consulta que eluda RLS.
 *
 * Mismo patrón que src/access/invitationToken.ts (HMAC-SHA256, comparación
 * en tiempo constante) — deliberadamente un archivo separado y no
 * compartido, siguiendo la convención ya establecida en el repo de Vercel
 * (signed-request.ts / data-deletion-status-token.ts tampoco comparten
 * código entre sí pese a la lógica HMAC similar).
 */

export class SessionTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionTokenError';
  }
}

export type SessionTokenPayload = {
  v: 1;
  tenantId: string;
  nonce: string;
  expiresAt: number; // epoch seconds
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecodeStrict(segment: string): Buffer | null {
  if (segment.length === 0 || !/^[A-Za-z0-9_-]+$/.test(segment)) {
    return null;
  }
  return Buffer.from(segment, 'base64url');
}

export function issueSessionToken(params: { tenantId: string; nonce: string; expiresAt: Date }, secret: string): string {
  if (!params.tenantId || !params.nonce) {
    throw new SessionTokenError('tenantId and nonce are required.');
  }

  const payload: SessionTokenPayload = {
    v: 1,
    tenantId: params.tenantId,
    nonce: params.nonce,
    expiresAt: Math.floor(params.expiresAt.getTime() / 1000),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${signature}.${encodedPayload}`;
}

function isValidPayloadShape(value: unknown): value is SessionTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.tenantId === 'string' &&
    candidate.tenantId.length > 0 &&
    typeof candidate.nonce === 'string' &&
    candidate.nonce.length > 0 &&
    typeof candidate.expiresAt === 'number'
  );
}

export function verifySessionToken(token: string, secret: string, now: number = Date.now()): SessionTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new SessionTokenError('Malformed session token — expected exactly one separator.');
  }

  const encodedSignature = parts[0];
  const encodedPayload = parts[1];
  if (!encodedSignature || !encodedPayload) {
    throw new SessionTokenError('Malformed session token — empty segment.');
  }

  const providedSignature = base64UrlDecodeStrict(encodedSignature);
  if (!providedSignature) {
    throw new SessionTokenError('Malformed session token — invalid signature encoding.');
  }

  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest();
  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
    throw new SessionTokenError('Invalid signature.');
  }

  const decodedPayload = base64UrlDecodeStrict(encodedPayload);
  if (!decodedPayload) {
    throw new SessionTokenError('Malformed session token — invalid payload encoding.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decodedPayload.toString('utf8'));
  } catch {
    throw new SessionTokenError('Malformed session token — payload is not valid JSON.');
  }

  if (!isValidPayloadShape(payload)) {
    throw new SessionTokenError('Malformed session token — unexpected payload shape.');
  }

  const nowSeconds = Math.floor(now / 1000);
  if (nowSeconds >= payload.expiresAt) {
    throw new SessionTokenError('Session token has expired.');
  }

  return payload;
}
