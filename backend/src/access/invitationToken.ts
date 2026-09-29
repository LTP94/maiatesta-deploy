import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Single-use enforcement (Redis-backed) vive en ./invitationTokenStore.ts —
// este archivo sigue siendo el primitivo puro, sin red, deliberadamente.

/**
 * Token de invitación — el mecanismo que responde a "no debe permitir que
 * alguien asocie arbitrariamente una cuenta de Meta con otro cliente" (Punto
 * 1 de la revisión). Primitivo puro, sin red ni base de datos — el mismo
 * estilo que server/meta/facebook/data-deletion-status-token.ts del repo de
 * Vercel (HMAC-SHA256 firmado, comparación en tiempo constante).
 *
 * IMPORTANTE — esto todavía NO está conectado a ningún endpoint. La Etapa 2
 * (onboarding/start, session, complete) es la que usaría este primitivo
 * para resolver el tenantId de una sesión de onboarding a partir de un
 * token, en vez de confiar en un tenantId que el navegador envíe
 * libremente. No se implementa esa ruta en esta revisión — solo el bloque
 * de construcción, ya probado.
 *
 * Flujo previsto (documentado en ARCHITECTURE_DECISION.md, Punto 1):
 *  1. Un administrador de Maiatesta (fuera de esta app, herramienta interna
 *     futura) llama `issueInvitationToken({ tenantId, adminUserId })`.
 *  2. El token resultante se entrega al cliente FUERA de banda (email,
 *     WhatsApp) — nunca hay una forma de auto-generarlo desde el navegador.
 *  3. El cliente visita /whatsapp/connect/?invite=<token> en Vercel.
 *  4. El frontend envía el token al backend de Hostinger en
 *     POST /onboarding/start.
 *  5. El backend llama `verifyInvitationToken(token)` — el tenantId de la
 *     sesión de onboarding sale del token verificado, JAMÁS de un campo del
 *     body que el navegador podría manipular.
 *  6. El `jti` del token se marca consumido (Redis, con TTL = tiempo
 *     restante hasta la expiración) — un token usado dos veces se rechaza,
 *     incluso si su firma sigue siendo válida. Esa parte requiere Redis y
 *     por tanto se implementa junto con el endpoint real en la Etapa 2, no
 *     aquí (este módulo no depende de infraestructura).
 *
 * Por qué no hay CSRF tradicional que mitigar aquí: la autenticación no usa
 * cookies de sesión ambientales — es un token que el cliente posee y envía
 * explícitamente en el body de la petición. CSRF explota que el navegador
 * adjunta cookies automáticamente a cualquier origen; sin cookies, no hay
 * superficie CSRF en este endpoint específico. CORS estricto
 * (`https://www.maiatesta.com` únicamente) y rate limiting siguen siendo
 * necesarios como defensa adicional contra fuerza bruta del token dentro de
 * su ventana de validez — eso se documenta, se implementa con el servidor
 * Express real en la Etapa 2.
 */

export class InvitationTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationTokenError';
  }
}

export type InvitationTokenPayload = {
  v: 1;
  tenantId: string;
  adminUserId: string;
  jti: string; // identificador único del token — lo que Redis marcaría como consumido en la Etapa 2
  issuedAt: number; // epoch seconds
  expiresAt: number; // epoch seconds
};

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días — invitación, no sesión activa

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecodeStrict(segment: string): Buffer | null {
  if (segment.length === 0 || !/^[A-Za-z0-9_-]+$/.test(segment)) {
    return null;
  }
  return Buffer.from(segment, 'base64url');
}

export function issueInvitationToken(
  params: { tenantId: string; adminUserId: string; ttlSeconds?: number },
  secret: string,
): string {
  if (!params.tenantId || !params.adminUserId) {
    throw new InvitationTokenError('tenantId and adminUserId are required.');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: InvitationTokenPayload = {
    v: 1,
    tenantId: params.tenantId,
    adminUserId: params.adminUserId,
    jti: randomBytes(16).toString('hex'),
    issuedAt: now,
    expiresAt: now + (params.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  return `${signature}.${encodedPayload}`;
}

/**
 * Emisión "exclusivamente mediante una operación administrativa
 * autenticada" (condición 1 de la Etapa 2): requiere un `adminApiKey` que
 * se compara en tiempo constante contra `expectedAdminApiKey` (proviene de
 * una variable de entorno separada, `ADMIN_API_KEY` — ver
 * src/config/env.ts —, independiente de `META_ONBOARDING_SESSION_SECRET`
 * que firma el token en sí). Sin esta credencial, `issueInvitationToken`
 * de arriba sigue siendo llamable directamente por cualquier código que
 * importe el módulo — por eso la Etapa 2 debe usar SOLO esta función desde
 * cualquier herramienta administrativa, nunca la de abajo sin el guard.
 */
export function issueInvitationTokenAsAdmin(
  params: { tenantId: string; adminUserId: string; ttlSeconds?: number; adminApiKey: string },
  secrets: { tokenSecret: string; expectedAdminApiKey: string },
): string {
  const provided = Buffer.from(params.adminApiKey, 'utf8');
  const expected = Buffer.from(secrets.expectedAdminApiKey, 'utf8');

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new InvitationTokenError('Not authorized to issue invitation tokens.');
  }

  return issueInvitationToken(params, secrets.tokenSecret);
}

function isValidPayloadShape(value: unknown): value is InvitationTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.tenantId === 'string' &&
    candidate.tenantId.length > 0 &&
    typeof candidate.adminUserId === 'string' &&
    candidate.adminUserId.length > 0 &&
    typeof candidate.jti === 'string' &&
    /^[a-f0-9]{32}$/.test(candidate.jti) &&
    typeof candidate.issuedAt === 'number' &&
    typeof candidate.expiresAt === 'number'
  );
}

/**
 * Verifica firma, forma del payload, Y expiración. NO verifica que el jti
 * no se haya usado antes — eso requiere estado compartido (Redis), fuera
 * del alcance de este primitivo puro; la Etapa 2 debe hacer esa
 * comprobación por separado usando el `jti` devuelto aquí.
 */
export function verifyInvitationToken(token: string, secret: string, now: number = Date.now()): InvitationTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new InvitationTokenError('Malformed token — expected exactly one separator.');
  }

  const encodedSignature = parts[0];
  const encodedPayload = parts[1];
  if (!encodedSignature || !encodedPayload) {
    throw new InvitationTokenError('Malformed token — empty segment.');
  }

  const providedSignature = base64UrlDecodeStrict(encodedSignature);
  if (!providedSignature) {
    throw new InvitationTokenError('Malformed token — invalid signature encoding.');
  }

  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest();
  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
    throw new InvitationTokenError('Invalid signature.');
  }

  const decodedPayload = base64UrlDecodeStrict(encodedPayload);
  if (!decodedPayload) {
    throw new InvitationTokenError('Malformed token — invalid payload encoding.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decodedPayload.toString('utf8'));
  } catch {
    throw new InvitationTokenError('Malformed token — payload is not valid JSON.');
  }

  if (!isValidPayloadShape(payload)) {
    throw new InvitationTokenError('Malformed token — unexpected payload shape.');
  }

  const nowSeconds = Math.floor(now / 1000);
  if (nowSeconds >= payload.expiresAt) {
    throw new InvitationTokenError('Token has expired.');
  }

  return payload;
}
