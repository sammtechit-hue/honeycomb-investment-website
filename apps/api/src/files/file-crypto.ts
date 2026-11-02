import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Envelope: [version 1B][iv 12B][auth tag 16B][ciphertext]
// Plaintext: [mime length 1B][mime ASCII][file bytes]
// The storage key is bound in as AAD, so a ciphertext copied to another
// user's path (or renamed) fails to decrypt instead of being served.
const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = 1 + IV_BYTES + TAG_BYTES;

export function encryptFile(
  key: Buffer,
  storageKey: string,
  mimeType: string,
  data: Buffer,
): Buffer {
  const mime = Buffer.from(mimeType, 'ascii');
  if (mime.length > 255) throw new Error('MIME type too long');

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(storageKey, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from([mime.length])),
    cipher.update(mime),
    cipher.update(data),
    cipher.final(),
  ]);

  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptFile(
  key: Buffer,
  storageKey: string,
  blob: Buffer,
): { mimeType: string; data: Buffer } {
  if (blob.length < HEADER_BYTES + 1 || blob[0] !== VERSION) {
    throw new Error('Unrecognised file envelope');
  }

  const iv = blob.subarray(1, 1 + IV_BYTES);
  const tag = blob.subarray(1 + IV_BYTES, HEADER_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(storageKey, 'utf8'));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(blob.subarray(HEADER_BYTES)),
    decipher.final(),
  ]);

  const mimeLength = plaintext[0];
  return {
    mimeType: plaintext.subarray(1, 1 + mimeLength).toString('ascii'),
    data: plaintext.subarray(1 + mimeLength),
  };
}
