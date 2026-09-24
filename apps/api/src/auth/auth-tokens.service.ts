import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Role } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env';
import { REFRESH_REUSE_GRACE_SECONDS } from './auth.constants';
import type { JwtPayload } from './types/jwt-payload.interface';

export interface IssuedTokens {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

interface TokenSubject {
  id: string;
  role: Role;
  tokenVersion: number;
}

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

// Refresh tokens are opaque random strings, never JWTs: they're only
// meaningful as a lookup key into refresh_tokens, and only their hash is
// stored there.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // New login → new refresh-token family with a fixed absolute expiry.
  async issueForNewSession(
    user: TokenSubject,
    client: ClientInfo,
  ): Promise<IssuedTokens> {
    const refreshExpiresAt = new Date(
      Date.now() + this.sessionTtlHours(user.role) * 60 * 60 * 1000,
    );
    const refresh = await this.createRefreshToken(
      user.id,
      randomUUID(),
      refreshExpiresAt,
      client,
    );
    const access = await this.signAccessToken(user);
    return { ...access, ...refresh };
  }

  // Consumes the presented refresh token and issues its successor in the
  // same family. The successor keeps the family's original expiry, so a
  // session can't be kept alive forever by refreshing.
  async rotate(presentedToken: string, client: ClientInfo) {
    const tokenHash = hashRefreshToken(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
            tokenVersion: true,
            adminProfile: { select: { allowedIpRange: true } },
          },
        },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();

    if (stored.revokedAt) {
      const secondsSinceRevoked =
        (now.getTime() - stored.revokedAt.getTime()) / 1000;
      if (secondsSinceRevoked > REFRESH_REUSE_GRACE_SECONDS) {
        // Replay of a consumed token = someone else has a copy. Kill the
        // whole family AND every outstanding access token for this user.
        await this.revokeFamilyAndBumpVersion(stored.familyId, stored.userId);
      }
      throw new UnauthorizedException('Refresh token has already been used');
    }

    if (stored.expiresAt <= now) {
      throw new UnauthorizedException('Session has expired');
    }
    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Atomic consume: only one concurrent request can flip revokedAt from
    // null. The loser gets a 401 instead of minting a second valid token.
    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const refresh = await this.createRefreshToken(
      stored.userId,
      stored.familyId,
      stored.expiresAt,
      client,
    );
    const access = await this.signAccessToken(stored.user);

    return { user: stored.user, tokens: { ...access, ...refresh } };
  }

  // Best-effort: used by logout, where an unknown/expired token is fine.
  async revokeFamilyOf(presentedToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(presentedToken) },
      select: { familyId: true },
    });
    if (!stored) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Kills every session for a user: all refresh tokens, and — via the
  // tokenVersion bump — every access token already handed out.
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }

  // Verifies an access token without the DB checks — for logout, which
  // only needs the jti/exp of a token we genuinely signed.
  async decodeVerifiedAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  private async revokeFamilyAndBumpVersion(familyId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      }),
    ]);
  }

  private async signAccessToken(user: TokenSubject) {
    const ttlMinutes = this.config.get('ACCESS_TOKEN_TTL_MINUTES', {
      infer: true,
    });
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tv: user.tokenVersion,
      jti: randomUUID(),
    };
    // expiresIn/algorithm/issuer/audience come from JwtModule's signOptions.
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      accessExpiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    };
  }

  private async createRefreshToken(
    userId: string,
    familyId: string,
    expiresAt: Date,
    client: ClientInfo,
  ) {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refreshToken),
        familyId,
        expiresAt,
        userId,
        createdByIp: client.ip?.slice(0, 45),
        userAgent: client.userAgent?.slice(0, 255),
      },
    });
    return { refreshToken, refreshExpiresAt: expiresAt };
  }

  private sessionTtlHours(role: Role): number {
    return role === Role.INVESTOR
      ? this.config.get('INVESTOR_SESSION_TTL_HOURS', { infer: true })
      : this.config.get('ADMIN_SESSION_TTL_HOURS', { infer: true });
  }
}
