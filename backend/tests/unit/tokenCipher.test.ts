import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, TokenCipherError } from '../../src/crypto/tokenCipher.js';

const KEY = randomBytes(32);
const OTHER_KEY = randomBytes(32);

describe('tokenCipher', () => {
  it('round-trips a plaintext value', () => {
    const plaintext = 'EAABsbCS1...a-real-looking-meta-access-token';
    const encrypted = encryptToken(plaintext, KEY);
    expect(decryptToken(encrypted, KEY)).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const a = encryptToken('same-value', KEY);
    const b = encryptToken('same-value', KEY);
    expect(a).not.toBe(b);
  });

  it('never leaks the plaintext in the serialized form', () => {
    const plaintext = 'super-secret-token-value';
    const encrypted = encryptToken(plaintext, KEY);
    expect(encrypted).not.toContain(plaintext);
  });

  it('rejects decryption with the wrong key', () => {
    const encrypted = encryptToken('value', KEY);
    expect(() => decryptToken(encrypted, OTHER_KEY)).toThrow(TokenCipherError);
  });

  it('rejects a tampered ciphertext (GCM auth tag catches it)', () => {
    const encrypted = encryptToken('value', KEY);
    const parts = encrypted.split('.');
    const tamperedCiphertext = Buffer.from(parts[2] ?? '', 'base64url');
    tamperedCiphertext[0] = (tamperedCiphertext[0] ?? 0) ^ 0xff;
    const tampered = `${parts[0]}.${parts[1]}.${tamperedCiphertext.toString('base64url')}`;
    expect(() => decryptToken(tampered, KEY)).toThrow(TokenCipherError);
  });

  it('rejects a tampered auth tag', () => {
    const encrypted = encryptToken('value', KEY);
    const parts = encrypted.split('.');
    const tamperedTag = Buffer.from(parts[1] ?? '', 'base64url');
    tamperedTag[0] = (tamperedTag[0] ?? 0) ^ 0xff;
    const tampered = `${parts[0]}.${tamperedTag.toString('base64url')}.${parts[2]}`;
    expect(() => decryptToken(tampered, KEY)).toThrow(TokenCipherError);
  });

  it('rejects malformed input with the wrong number of segments', () => {
    expect(() => decryptToken('only.two', KEY)).toThrow(/3 segments/);
    expect(() => decryptToken('a.b.c.d', KEY)).toThrow(/3 segments/);
  });

  it('rejects a key of the wrong length', () => {
    expect(() => encryptToken('value', randomBytes(16))).toThrow(/32 bytes/);
    expect(() => decryptToken('a.b.c', randomBytes(16))).toThrow(/32 bytes/);
  });

  it('handles empty-string plaintext', () => {
    const encrypted = encryptToken('', KEY);
    expect(decryptToken(encrypted, KEY)).toBe('');
  });

  it('handles unicode plaintext correctly', () => {
    const plaintext = 'token-con-ñ-y-emoji-🔒';
    const encrypted = encryptToken(plaintext, KEY);
    expect(decryptToken(encrypted, KEY)).toBe(plaintext);
  });
});
