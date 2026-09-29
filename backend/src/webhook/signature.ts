import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verificación de `X-Hub-Signature-256` — confirmado contra la
 * documentación oficial vigente de Meta (Graph API Webhooks, "Validating
 * Payloads"): "We sign all Event Notification payloads with a SHA256
 * signature and include the signature in the request's
 * X-Hub-Signature-256 header, preceded with sha256=." La validación es
 * HMAC-SHA256 sobre el CUERPO CRUDO (bytes exactos recibidos, antes de
 * cualquier parseo JSON) usando el App Secret de Meta como clave —
 * exactamente el mismo primitivo que `server/meta/facebook/signed-request.ts`
 * del repo Vercel ya usa para otro propósito (comparación en tiempo
 * constante, nunca `===` sobre datos derivados de la red).
 *
 * Por qué el cuerpo debe ser el buffer crudo y no `JSON.stringify(parsed)`:
 * la firma la calcula Meta sobre los bytes exactos que envió — cualquier
 * diferencia de formato (espacios, orden de claves) al re-serializar
 * produciría una firma distinta y rechazaría payloads legítimos. Por eso
 * `src/webhook/routes.ts` captura el body con `express.raw()`, nunca con
 * `express.json()`, para esta ruta específicamente.
 */

const SIGNATURE_PREFIX = 'sha256=';

export function computeSignatureHex(rawBody: Buffer, appSecret: string): string {
  return createHmac('sha256', appSecret).update(rawBody).digest('hex');
}

/**
 * Comparación en tiempo constante. Acepta `undefined` (header ausente) y
 * cualquier string malformado sin lanzar — un llamador que olvide manejar
 * una excepción aquí no debe terminar accidentalmente aceptando la firma
 * por un error no capturado.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  // Longitud fija esperada de un digest SHA-256 en hex — rechaza basura
  // obviamente malformada antes de intentar decodificarla.
  if (!/^[a-f0-9]{64}$/i.test(providedHex)) {
    return false;
  }

  const expectedHex = computeSignatureHex(rawBody, appSecret);
  const provided = Buffer.from(providedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
