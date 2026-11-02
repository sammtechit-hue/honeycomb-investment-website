import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalStorageDriver } from './storage-drivers';

describe('LocalStorageDriver', () => {
  let dir: string;
  let driver: LocalStorageDriver;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kyc-storage-'));
    driver = new LocalStorageDriver(dir);
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('stores and reads back a blob under nested keys', async () => {
    await driver.put('kyc/owner/file', Buffer.from('blob'));
    expect(await driver.get('kyc/owner/file')).toEqual(Buffer.from('blob'));
  });

  it('returns null for a missing key', async () => {
    expect(await driver.get('kyc/owner/missing')).toBeNull();
  });

  it('leaves no temp files behind', async () => {
    await driver.put('kyc/owner/file', Buffer.from('blob'));
    expect(await readdir(join(dir, 'kyc', 'owner'))).toEqual(['file']);
  });

  it('refuses keys that escape the storage root', async () => {
    await expect(driver.put('../outside', Buffer.from('x'))).rejects.toThrow(
      'escapes the storage root',
    );
    await expect(driver.get('kyc/../../outside')).rejects.toThrow(
      'escapes the storage root',
    );
  });
});
