import { afterEach, describe, expect, it } from 'vitest';
import { ConfigError, getWebhookPayloadEncryptionKey } from '../../src/config/env.js';
import { decryptToken, encryptToken, TokenCipherError } from '../../src/crypto/tokenCipher.js';
import { computeSignatureHex, verifyWebhookSignature } from '../../src/webhook/signature.js';

const ORIGINAL_PAYLOAD_KEY = process.env.META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY;

afterEach(() => {
  if (ORIGINAL_PAYLOAD_KEY === undefined) delete process.env.META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY;
  else process.env.META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY = ORIGINAL_PAYLOAD_KEY;
});

describe('seguridad de firma del webhook', () => {
  const body = Buffer.from('{"synthetic":"payload"}');
  const secret = 'test-app-secret';

  it('acepta solamente HMAC-SHA256 exacto sobre los bytes originales', () => {
    const header = `sha256=${computeSignatureHex(body, secret)}`;
    expect(verifyWebhookSignature(body, header, secret)).toBe(true);
    expect(verifyWebhookSignature(Buffer.from(`${body.toString()} `), header, secret)).toBe(false);
  });

  it('rechaza firma ausente, prefijo incorrecto, longitud incorrecta y caracteres no hex', () => {
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(body, `sha1=${'0'.repeat(64)}`, secret)).toBe(false);
    expect(verifyWebhookSignature(body, 'sha256=00', secret)).toBe(false);
    expect(verifyWebhookSignature(body, `sha256=${'z'.repeat(64)}`, secret)).toBe(false);
  });
});

describe('protección de payloads persistidos', () => {
  const key = Buffer.from('d'.repeat(64), 'hex');

  it('AES-256-GCM no conserva el contenido en texto claro y permite recuperación autorizada', () => {
    const plaintext = JSON.stringify({ text: 'synthetic private message', access_token: undefined });
    const encrypted = encryptToken(plaintext, key);
    expect(encrypted).not.toContain('synthetic private message');
    expect(decryptToken(encrypted, key)).toBe(plaintext);
  });

  it('detecta manipulación y clave equivocada sin revelar cuál ocurrió', () => {
    const encrypted = encryptToken('synthetic private message', key);
    const wrongKey = Buffer.from('e'.repeat(64), 'hex');
    expect(() => decryptToken(`${encrypted}x`, key)).toThrow(TokenCipherError);
    expect(() => decryptToken(encrypted, wrongKey)).toThrow('invalid, tampered, or was encrypted with a different key');
  });
});

describe('configuración fail-closed de la clave de payload', () => {
  it('rechaza clave ausente o de tamaño incorrecto sin imprimir su valor', () => {
    delete process.env.META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY;
    expect(() => getWebhookPayloadEncryptionKey()).toThrow(new ConfigError('META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY is not configured.'));
    process.env.META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY = 'secret-too-short';
    expect(() => getWebhookPayloadEncryptionKey()).toThrow(/64 hex characters/);
  });

  it('acepta exactamente 32 bytes hexadecimales', () => {
    process.env.META_WEBHOOK_PAYLOAD_ENCRYPTION_KEY = 'f'.repeat(64);
    expect(getWebhookPayloadEncryptionKey()).toEqual(Buffer.from('f'.repeat(64), 'hex'));
  });
});
