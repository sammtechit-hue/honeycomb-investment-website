import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { KYC_MAX_BYTES, KycFilesService } from './kyc-files.service';

// The subset of multer's file object this controller reads (memory storage).
type UploadedBuffer = { buffer: Buffer; size: number };

@Controller('files')
@UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly kycFiles: KycFilesService) {}

  // POST /api/files/kyc  (multipart/form-data, field "file")
  @Post('kyc')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.INVESTOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    // No `dest` → multer keeps the upload in memory; it is encrypted before
    // anything touches disk. +1 byte so an exactly-5MB file isn't rejected.
    FileInterceptor('file', { limits: { fileSize: KYC_MAX_BYTES + 1, files: 1 } }),
  )
  upload(
    @UploadedFile() file: UploadedBuffer | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Choose a file to upload');
    return this.kycFiles.upload(user.userId, file.buffer);
  }

  // GET /api/files/kyc/:ownerId/:fileId — the owner, or any admin role.
  @Get('kyc/:ownerId/:fileId')
  @Roles(Role.INVESTOR, Role.ADMIN, Role.MODERATOR)
  // Admins page through review queues full of document thumbnails.
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async read(
    @Param('ownerId') ownerId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const file = await this.kycFiles.read(user, ownerId, fileId);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.data.length),
      'Content-Disposition': 'inline',
      // Identity documents: never cached by the browser or any proxy.
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // A PDF can carry script; render it sandboxed if opened directly.
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    });
    res.send(file.data);
  }
}
