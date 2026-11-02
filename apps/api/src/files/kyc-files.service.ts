import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Role } from '@investment-platform/db';
import type { Env } from '../config/env';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { decryptFile, encryptFile } from './file-crypto';
import {
  LocalStorageDriver,
  SupabaseStorageDriver,
  type StorageDriver,
} from './storage-drivers';

export const KYC_MAX_BYTES = 5 * 1024 * 1024;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_RE = new RegExp(`^${UUID}$`);
// The URL handed back on upload, and the only shape createInvestor accepts.
const KYC_URL_PATH_RE = new RegExp(`^/api/files/kyc/(${UUID})/(${UUID})$`);

const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR];

// Identify the file from its bytes — the browser-supplied MIME type and
// file name are attacker-controlled and never trusted.
function sniffMimeType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (data.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

const storageKey = (ownerId: string, fileId: string) => `kyc/${ownerId}/${fileId}`;

@Injectable()
export class KycFilesService {
  private readonly logger = new Logger(KycFilesService.name);
  private readonly driver: StorageDriver;
  private readonly key: Buffer | null;
  private readonly appUrl: string;
  private readonly allowedOrigins: Set<string>;

  constructor(config: ConfigService<Env, true>) {
    const encryptionKey = config.get('STORAGE_ENCRYPTION_KEY', { infer: true });
    this.key = encryptionKey ? Buffer.from(encryptionKey, 'base64') : null;
    if (!this.key) {
      this.logger.warn('STORAGE_ENCRYPTION_KEY is not set — KYC uploads are disabled');
    }

    this.driver =
      config.get('STORAGE_DRIVER', { infer: true }) === 'supabase'
        ? new SupabaseStorageDriver(
            config.get('SUPABASE_URL', { infer: true })!,
            config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true })!,
            config.get('SUPABASE_STORAGE_BUCKET', { infer: true }),
          )
        : new LocalStorageDriver(config.get('STORAGE_LOCAL_DIR', { infer: true }));

    const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
    this.appUrl = (config.get('APP_URL', { infer: true }) ?? corsOrigins[0]).replace(/\/+$/, '');
    // Any secure-web origin is accepted when validating submitted URLs, so a
    // domain move doesn't strand documents uploaded under the old one.
    this.allowedOrigins = new Set(
      [this.appUrl, ...corsOrigins].map((origin) => new URL(origin).origin),
    );
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new ServiceUnavailableException('Document uploads are not available right now');
    }
    return this.key;
  }

  // Returns the URL the client submits in POST /investor. It points at
  // secure-web's /api proxy, so the browser sends the session cookie.
  async upload(ownerId: string, data: Buffer): Promise<{ url: string; mimeType: string }> {
    const key = this.requireKey();
    if (data.length === 0) throw new BadRequestException('The file is empty');
    if (data.length > KYC_MAX_BYTES) throw new BadRequestException('Files must be 5 MB or smaller');

    const mimeType = sniffMimeType(data);
    if (!mimeType) {
      throw new BadRequestException('Upload a JPG, PNG, WEBP or PDF file');
    }

    const fileId = randomUUID();
    const objectKey = storageKey(ownerId, fileId);
    await this.driver.put(objectKey, encryptFile(key, objectKey, mimeType, data));

    return { url: `${this.appUrl}/api/files/kyc/${ownerId}/${fileId}`, mimeType };
  }

  async read(
    requester: AuthenticatedUser,
    ownerId: string,
    fileId: string,
  ): Promise<{ mimeType: string; data: Buffer }> {
    const key = this.requireKey();
    if (!UUID_RE.test(ownerId) || !UUID_RE.test(fileId)) {
      throw new NotFoundException('File not found');
    }
    if (requester.userId !== ownerId && !ADMIN_ROLES.includes(requester.role)) {
      throw new ForbiddenException('You do not have access to this file');
    }

    const objectKey = storageKey(ownerId, fileId);
    const blob = await this.driver.get(objectKey);
    if (!blob) throw new NotFoundException('File not found');

    try {
      return decryptFile(key, objectKey, blob);
    } catch (error) {
      this.logger.error(`Could not decrypt ${objectKey}: ${(error as Error).message}`);
      throw new NotFoundException('File not found');
    }
  }

  // Every document URL an investor submits must be a file they uploaded
  // themselves through upload(). Stops arbitrary links (phishing pages,
  // another user's files) from landing in front of a reviewing admin.
  async assertOwnedUploads(ownerId: string, urls: (string | undefined)[]): Promise<void> {
    const present = urls.filter((url): url is string => !!url);
    if (present.length === 0) return;
    this.requireKey();

    await Promise.all(
      present.map(async (raw) => {
        let url: URL;
        try {
          url = new URL(raw);
        } catch {
          throw new BadRequestException('A document link is invalid. Please upload it again.');
        }
        const match = KYC_URL_PATH_RE.exec(url.pathname);
        if (!this.allowedOrigins.has(url.origin) || !match || match[1] !== ownerId) {
          throw new BadRequestException('A document link is invalid. Please upload it again.');
        }
        if (!(await this.driver.get(storageKey(ownerId, match[2])))) {
          throw new BadRequestException('An uploaded document was not found. Please upload it again.');
        }
      }),
    );
  }
}
