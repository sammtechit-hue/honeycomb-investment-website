import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { Role } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
import type { Env } from '../../config/env';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';
import { isIpAllowed } from '../admin-ip-allowlist';
import { JwtPayload, AuthenticatedUser } from '../types/jwt-payload.interface';

// Reads the access token from the httpOnly cookie set at login — never a
// header, never localStorage (see project stack decision on cookie auth).
// Requires cookie-parser to be mounted in main.ts so req.cookies exists.
function extractFromCookie(req: Request): string | null {
  const token: unknown = req?.cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractFromCookie,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
      // Pinned: only ever accept what we sign with. Stops algorithm-
      // confusion tricks (alg "none", RS/HS swaps) regardless of what the
      // token header claims.
      algorithms: ['HS256'],
      issuer: config.get('JWT_ISSUER', { infer: true }),
      audience: config.get('JWT_AUDIENCE', { infer: true }),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  // Runs on every request behind JwtAuthGuard, after signature/exp/iss/aud
  // have been verified:
  //  1. jti blacklist — this specific token was logged out.
  //  2. user still exists, still has the role the token claims, isn't
  //     deactivated, and tokenVersion matches (password change / "log out
  //     everywhere" / reuse detection kill all older tokens at once).
  //  3. admins only: request IP is inside their AdminProfile allowlist —
  //     enforced per request, not just at login, so a stolen admin cookie is
  //     useless off-network.
  async validate(req: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    if (
      typeof payload?.sub !== 'string' ||
      typeof payload?.jti !== 'string' ||
      typeof payload?.tv !== 'number' ||
      typeof payload?.exp !== 'number' ||
      !payload?.role
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const [blacklisted, user] = await Promise.all([
      this.prisma.blacklistedToken.findUnique({
        where: { jti: payload.jti },
        select: { jti: true },
      }),
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          isActive: true,
          tokenVersion: true,
          adminProfile: { select: { allowedIpRange: true } },
        },
      }),
    ]);

    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    if (
      !user ||
      user.role !== payload.role ||
      user.tokenVersion !== payload.tv
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    if (
      user.role !== Role.INVESTOR &&
      !isIpAllowed(req.ip, user.adminProfile?.allowedIpRange)
    ) {
      throw new UnauthorizedException('Access not permitted from this network');
    }

    return {
      userId: user.id,
      role: user.role,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
