import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from './auth.constants';

const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

// Per-identifier lockout: MAX_FAILED_LOGINS failures inside a
// LOCKOUT_MINUTES window locks that email/phone for LOCKOUT_MINUTES.
// Keyed on the identifier as typed (normalized), whether or not an account
// exists for it, so lockout behaviour itself doesn't reveal which
// identifiers are registered.
@Injectable()
export class LoginAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNotLocked(identifier: string): Promise<void> {
    const record = await this.prisma.loginAttempt.findUnique({
      where: { identifier },
      select: { blockedUntil: true },
    });
    if (record?.blockedUntil && record.blockedUntil > new Date()) {
      const minutes = Math.ceil(
        (record.blockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new HttpException(
        `Too many failed attempts. Try again in ${minutes} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // One atomic statement: a read-then-write would let parallel wrong
  // guesses overwrite each other's increments and slip past the limit.
  // A failure count older than the window, or a lock that has already run
  // out, restarts at 1 instead of carrying over.
  async recordFailure(identifier: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - LOCKOUT_MS);
    const lockUntil = new Date(now.getTime() + LOCKOUT_MS);

    await this.prisma.$executeRaw`
      INSERT INTO login_attempts (identifier, attempts, last_attempt, blocked_until)
      VALUES (${identifier}, 1, ${now}, NULL)
      ON CONFLICT (identifier) DO UPDATE SET
        attempts = CASE
          WHEN login_attempts.last_attempt < ${windowStart}
            OR login_attempts.blocked_until <= ${now}
          THEN 1
          ELSE login_attempts.attempts + 1
        END,
        blocked_until = CASE
          WHEN login_attempts.last_attempt >= ${windowStart}
            AND (login_attempts.blocked_until IS NULL OR login_attempts.blocked_until > ${now})
            AND login_attempts.attempts + 1 >= ${MAX_FAILED_LOGINS}
          THEN ${lockUntil}::timestamp
          ELSE NULL
        END,
        last_attempt = ${now}
    `;
  }

  async reset(identifier: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({ where: { identifier } });
  }
}
