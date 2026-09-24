import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Keeps the auth tables from growing forever. Everything deleted here is
// already useless: blacklisted jtis and refresh tokens past their expiry
// can't be presented successfully anyway, and stale login-attempt rows
// would be reset on the next attempt.
@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<void> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const [blacklist, refresh, attempts, links] = await this.prisma.$transaction([
        this.prisma.blacklistedToken.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
        this.prisma.refreshToken.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
        this.prisma.loginAttempt.deleteMany({
          where: {
            lastAttempt: { lt: dayAgo },
            OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
          },
        }),
        this.prisma.passwordToken.deleteMany({
          where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: dayAgo } }] },
        }),
      ]);
      this.logger.log(
        `Purged ${blacklist.count} blacklisted tokens, ${refresh.count} refresh tokens, ${attempts.count} login-attempt rows, ${links.count} password links`,
      );
    } catch (error) {
      this.logger.error('Auth cleanup failed', error as Error);
    }
  }
}
