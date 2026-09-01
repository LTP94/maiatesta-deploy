import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verification errors for Meta's `signed_request` format. `code` maps 1:1 to
 * an HTTP status in the calling `api/` handler — this module itself never
 * touches Response objects, keeping it framework-agnostic and testable in
 * isolation.
 */
export class SignedRequestError extends Error {
  code:
    | 'missing'
    | 'malformed'
    | 'invalid_signature'
    | 'unsupported_content_type'
    | 'payload_too_large';

  constructor(
    code: SignedRequestError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'SignedRequestError';
    this.code = code;
  }
}

// Meta signed requests are small (a base64url-encoded signature + a small
// JSON payload). This is a defense-in-depth guard, not the sole size
// boundary — Vercel's own platform request-body limits are the actual
// backstop and still apply regardless of whether this fires (e.g. when
// Content-Length is absent).
const MAX_CONTENT_LENGTH_BYTES = 16 * 1024;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Strict base64url decode — rejects empty segments, classic-base64
 * characters ('+', '/', '='), whitespace, unicode, and control characters
 * via regex *before* decoding, rather than letting Buffer.from() silently
 * normalize or ignore invalid input.
 */
function decodeBase64UrlStrict(segment: string): Buffer {
  if (segment.length === 0 || !BASE64URL_PATTERN.test(segment)) {
    throw new SignedRequestError('malformed', 'Invalid base64url segment.');
  }

  return Buffer.from(segment, 'base64url');
}

/**
 * Pulls the `signed_request` field out of a POST body. Requires
 * application/x-www-form-urlencoded (with optional parameters like
 * charset), rejects oversized bodies before parsing, and requires exactly
 * one `signed_request` field — a duplicate field is never silently resolved
 * by picking the first or last value.
 */
export async function extractSignedRequestField(request: Request): Promise<string> {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
    throw new SignedRequestError(
      'unsupported_content_type',
      'Expected application/x-www-form-urlencoded.',
    );
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_CONTENT_LENGTH_BYTES) {
      throw new SignedRequestError('payload_too_large', 'Request body too large.');
    }
  }

  const formData = await request.formData();
  const values = formData.getAll('signed_request');

  if (values.length !== 1 || typeof values[0] !== 'string' || values[0].length === 0) {
    throw new SignedRequestError('missing', 'Missing or duplicate signed_request field.');
  }

  return values[0];
}

/**
 * Verifies a Meta `signed_request` string (`<sig>.<payload>`, both
 * base64url) against the given app secret, following Meta's documented
 * algorithm:
 *   1. split into exactly 2 dot-separated parts
 *   2. base64url-decode the signature
 *   3. recompute HMAC-SHA256(secret, encodedPayload)
 *   4. compare in constant time (never `===`)
 *   5. only then decode + JSON.parse the payload
 *   6. check payload.algorithm === 'HMAC-SHA256'
 *
 * Returns the parsed payload on success; throws SignedRequestError otherwise.
 * Callers are responsible for validating `user_id` themselves, since
 * deauthorize/data-deletion have slightly different requirements around it.
 */
export function verifySignedRequest(
  signedRequest: string,
  appSecret: string,
): Record<string, unknown> {
  const parts = signedRequest.split('.');

  if (parts.length !== 2) {
    throw new SignedRequestError('malformed', 'signed_request must have exactly one separator.');
  }

  const [encodedSignature, encodedPayload] = parts;

  const providedSignature = decodeBase64UrlStrict(encodedSignature);
  const expectedSignature = createHmac('sha256', appSecret).update(encodedPayload).digest();

  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    throw new SignedRequestError('invalid_signature', 'Signature verification failed.');
  }

  const decodedPayload = decodeBase64UrlStrict(encodedPayload);

  let payload: unknown;
  try {
    payload = JSON.parse(decodedPayload.toString('utf8'));
  } catch {
    throw new SignedRequestError('malformed', 'Payload is not valid JSON.');
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    (payload as Record<string, unknown>).algorithm !== 'HMAC-SHA256'
  ) {
    throw new SignedRequestError('malformed', 'Unsupported or missing algorithm.');
  }

  return payload as Record<string, unknown>;
}

const STATUS_BY_CODE: Record<SignedRequestError['code'], number> = {
  missing: 400,
  malformed: 400,
  invalid_signature: 401,
  unsupported_content_type: 415,
  payload_too_large: 413,
};

/**
 * Shared error->Response mapping so both callback handlers produce
 * identical, generic error bodies — never the missing var name, expected
 * or received signature, decoded user_id, stack trace, environment name,
 * or filesystem paths.
 */
export function errorResponseForSignedRequestError(error: SignedRequestError): Response {
  return new Response(JSON.stringify({ error: 'request_rejected' }), {
    status: STATUS_BY_CODE[error.code],
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Generic 500 for missing server configuration or unexpected failures — never reveals which. */
export function genericServerErrorResponse(): Response {
  return new Response(JSON.stringify({ error: 'internal_error' }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
