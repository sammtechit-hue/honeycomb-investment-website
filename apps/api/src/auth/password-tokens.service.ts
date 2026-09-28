import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PasswordTokenPurpose } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env';

export const PASSWORD_RESET_TTL_MINUTES = 30;
export const ACCOUNT_INVITE_TTL_HOURS = 72;

const TTL_MS: Record<PasswordTokenPurpose, number> = {
  PASSWORD_RESET: PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  ACCOUNT_INVITE: ACCOUNT_INVITE_TTL_HOURS * 60 * 60 * 1000,
};

const PAGE: Record<PasswordTokenPurpose, string> = {
  PASSWORD_RESET: '/reset-password',
  ACCOUNT_INVITE: '/set-password',
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Single-use, emailed password links (see PasswordToken model).
@Injectable()
export class PasswordTokensService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = (
      config.get('APP_URL', { infer: true }) ??
      config.get('CORS_ORIGINS', { infer: true })[0]
    ).replace(/\/+$/, '');
  }

  // Invalidates the user's other unused links, then issues a new one.
  // Returns the full URL to email. The token is in the #fragment, which
  // browsers never send to any server — so it can't leak into access logs
  // or Referer headers on the reset page.
  async issue(
    userId: string,
    purpose: PasswordTokenPurpose,
    requestedIp?: string,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.passwordToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordToken.create({
        data: {
          tokenHash: hashToken(token),
          purpose,
          userId,
          expiresAt: new Date(now.getTime() + TTL_MS[purpose]),
          requestedIp: requestedIp?.slice(0, 45),
        },
      }),
    ]);

    return `${this.appUrl}${PAGE[purpose]}#token=${token}`;
  }

  async issuedWithin(
    userId: string,
    purpose: PasswordTokenPurpose,
    seconds: number,
  ): Promise<boolean> {
    const recent = await this.prisma.passwordToken.findFirst({
      where: {
        userId,
        purpose,
        createdAt: { gt: new Date(Date.now() - seconds * 1000) },
      },
      select: { id: true },
    });
    return recent !== null;
  }

  // Returns the token's owner if the token is valid, and marks it used in
  // the same atomic step — two concurrent submissions of one link can't
  // both succeed. Returns null for unknown, used or expired tokens.
  async consume(token: string) {
    const stored = await this.prisma.passwordToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        purpose: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            adminProfile: { select: { id: true, name: true } },
          },
        },
      },
    });

    const now = new Date();
    if (!stored || stored.usedAt || stored.expiresAt <= now) return null;
    if (!stored.user.isActive) return null;

    const claimed = await this.prisma.passwordToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;

    return { purpose: stored.purpose, user: stored.user };
  }
}
