import { randomBytes } from 'crypto';
import { decryptFile, encryptFile } from './file-crypto';

describe('file-crypto', () => {
  const key = randomBytes(32);
  const storageKey = 'kyc/owner/file';
  const data = Buffer.from('%PDF-1.7 hello');

  it('round-trips the bytes and MIME type', () => {
    const blob = encryptFile(key, storageKey, 'application/pdf', data);
    expect(decryptFile(key, storageKey, blob)).toEqual({
      mimeType: 'application/pdf',
      data,
    });
  });

  it('never stores plaintext', () => {
    const blob = encryptFile(key, storageKey, 'application/pdf', data);
    expect(blob.includes(data)).toBe(false);
    expect(blob.includes(Buffer.from('application/pdf'))).toBe(false);
  });

  it('uses a fresh IV per file', () => {
    const a = encryptFile(key, storageKey, 'image/png', data);
    const b = encryptFile(key, storageKey, 'image/png', data);
    expect(a.equals(b)).toBe(false);
  });

  it('rejects a blob moved to another storage key', () => {
    const blob = encryptFile(key, storageKey, 'image/png', data);
    expect(() => decryptFile(key, 'kyc/someone-else/file', blob)).toThrow();
  });

  it('rejects the wrong key', () => {
    const blob = encryptFile(key, storageKey, 'image/png', data);
    expect(() => decryptFile(randomBytes(32), storageKey, blob)).toThrow();
  });

  it('rejects tampered ciphertext', () => {
    const blob = encryptFile(key, storageKey, 'image/png', data);
    blob[blob.length - 1] ^= 0xff;
    expect(() => decryptFile(key, storageKey, blob)).toThrow();
  });

  it('rejects an unknown envelope version', () => {
    const blob = encryptFile(key, storageKey, 'image/png', data);
    blob[0] = 2;
    expect(() => decryptFile(key, storageKey, blob)).toThrow('Unrecognised file envelope');
  });
});
