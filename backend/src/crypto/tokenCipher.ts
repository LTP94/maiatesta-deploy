import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado autenticado (AES-256-GCM) para credenciales de Meta en reposo.
 * Misma filosofía que server/meta/facebook/signed-request.ts del repo
 * Vercel: solo `node:crypto`, sin dependencias de cifrado de terceros.
 *
 * Formato serializado: `<iv>.<authTag>.<ciphertext>`, los tres en base64url
 * — un solo string que cabe en la columna `Credential.encryptedValue`.
 * GCM detecta cualquier manipulación del ciphertext o del authTag en el
 * momento de descifrar (lanza, no devuelve basura silenciosamente).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits — tamaño recomendado para GCM, no 16

export class TokenCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenCipherError';
  }
}

export function encryptToken(plaintext: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new TokenCipherError('Encryption key must be 32 bytes.');
  }

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64url'), authTag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptToken(serialized: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new TokenCipherError('Encryption key must be 32 bytes.');
  }

  const parts = serialized.split('.');
  if (parts.length !== 3) {
    throw new TokenCipherError('Malformed encrypted token — expected exactly 3 segments.');
  }

  const ivPart = parts[0];
  const authTagPart = parts[1];
  const ciphertextPart = parts[2];
  // iv/authTag are fixed-length regardless of plaintext, so they can never
  // legitimately be empty — but ciphertext CAN be empty (encrypting the
  // empty string yields zero ciphertext bytes in GCM), so it's checked only
  // for being present (not undefined), not for being non-empty.
  if (!ivPart || !authTagPart || ciphertextPart === undefined) {
    throw new TokenCipherError('Malformed encrypted token — empty segment.');
  }

  let iv: Buffer;
  let authTag: Buffer;
  let ciphertext: Buffer;

  try {
    iv = Buffer.from(ivPart, 'base64url');
    authTag = Buffer.from(authTagPart, 'base64url');
    ciphertext = Buffer.from(ciphertextPart, 'base64url');
  } catch {
    throw new TokenCipherError('Malformed encrypted token — invalid base64url segment.');
  }

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new TokenCipherError('Malformed encrypted token — invalid IV length.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    // GCM auth-tag mismatch lands here — tampered or wrong-key ciphertext.
    // Never leak which of the two it was.
    throw new TokenCipherError('Decryption failed — token is invalid, tampered, or was encrypted with a different key.');
  }
}
