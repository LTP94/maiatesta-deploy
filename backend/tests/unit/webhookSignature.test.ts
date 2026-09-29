import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeSignatureHex, verifyWebhookSignature } from '../../src/webhook/signature.js';

const APP_SECRET = 'test-meta-app-secret-do-not-use-in-prod';

function sign(body: Buffer, secret = APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifyWebhookSignature', () => {
  it('acepta una firma válida calculada sobre el cuerpo exacto', () => {
    const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
    expect(verifyWebhookSignature(body, sign(body), APP_SECRET)).toBe(true);
  });

  it('rechaza si el cuerpo fue modificado DESPUÉS de firmarlo (integridad)', () => {
    const original = Buffer.from(JSON.stringify({ a: 1 }));
    const signature = sign(original);
    const tampered = Buffer.from(JSON.stringify({ a: 2 }));
    expect(verifyWebhookSignature(tampered, signature, APP_SECRET)).toBe(false);
  });

  it('rechaza una firma calculada con un App Secret distinto', () => {
    const body = Buffer.from(JSON.stringify({ a: 1 }));
    const signature = sign(body, 'wrong-secret');
    expect(verifyWebhookSignature(body, signature, APP_SECRET)).toBe(false);
  });

  it('rechaza cuando el header no tiene el prefijo sha256=', () => {
    const body = Buffer.from('{}');
    const rawHex = createHmac('sha256', APP_SECRET).update(body).digest('hex');
    expect(verifyWebhookSignature(body, rawHex, APP_SECRET)).toBe(false);
  });

  it('rechaza cuando el header está ausente', () => {
    const body = Buffer.from('{}');
    expect(verifyWebhookSignature(body, undefined, APP_SECRET)).toBe(false);
  });

  it('rechaza un header con hex de longitud incorrecta sin lanzar', () => {
    const body = Buffer.from('{}');
    expect(verifyWebhookSignature(body, 'sha256=abc123', APP_SECRET)).toBe(false);
  });

  it('rechaza un header con caracteres no-hex sin lanzar', () => {
    const body = Buffer.from('{}');
    const garbage = 'sha256=' + 'z'.repeat(64);
    expect(verifyWebhookSignature(body, garbage, APP_SECRET)).toBe(false);
  });

  it('computeSignatureHex produce el mismo valor que un cálculo HMAC manual', () => {
    const body = Buffer.from('hello world');
    const expected = createHmac('sha256', APP_SECRET).update(body).digest('hex');
    expect(computeSignatureHex(body, APP_SECRET)).toBe(expected);
  });

  it('el cuerpo vacío también produce una firma verificable (caso límite)', () => {
    const body = Buffer.alloc(0);
    expect(verifyWebhookSignature(body, sign(body), APP_SECRET)).toBe(true);
  });
});
