import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';

// Stores opaque (already encrypted) blobs by key. Keys are validated by
// KycFilesService before they get here — drivers only guard against
// escaping their root.
export interface StorageDriver {
  put(key: string, blob: Buffer): Promise<void>;
  // null when the key doesn't exist.
  get(key: string): Promise<Buffer | null>;
}

export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(dir: string) {
    this.root = resolve(dir);
  }

  private pathFor(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) {
      throw new Error('Storage key escapes the storage root');
    }
    return path;
  }

  async put(key: string, blob: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    // Write-then-rename so a crash never leaves a truncated file behind.
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, blob, { mode: 0o600 });
    await rename(tmp, path);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathFor(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}

// Supabase Storage REST API, authenticated with the service_role key. The
// bucket must be PRIVATE; objects are only ever reached through the API.
export class SupabaseStorageDriver implements StorageDriver {
  private readonly base: string;

  constructor(
    url: string,
    private readonly serviceRoleKey: string,
    private readonly bucket: string,
  ) {
    this.base = `${url.replace(/\/+$/, '')}/storage/v1/object`;
  }

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      ...extra,
    };
  }

  async put(key: string, blob: Buffer): Promise<void> {
    const res = await fetch(`${this.base}/${this.bucket}/${key}`, {
      method: 'POST',
      headers: this.headers({
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'false',
      }),
      body: new Uint8Array(blob),
    });
    if (!res.ok) {
      throw new Error(`Supabase upload failed (${res.status}): ${await res.text()}`);
    }
  }

  async get(key: string): Promise<Buffer | null> {
    const res = await fetch(`${this.base}/authenticated/${this.bucket}/${key}`, {
      headers: this.headers(),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());

    // Storage answers a missing object with 400 or 404 (body statusCode "404").
    const text = await res.text();
    if (res.status === 404 || (res.status === 400 && text.includes('404'))) {
      return null;
    }
    throw new Error(`Supabase download failed (${res.status}): ${text}`);
  }
}
