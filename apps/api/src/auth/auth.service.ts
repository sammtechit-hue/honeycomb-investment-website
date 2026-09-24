import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  LogModule,
  LogSeverity,
  LogStatus,
  PasswordTokenPurpose,
  Role,
} from '@investment-platform/db';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from '@investment-platform/contracts/auth';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthTokensService, IssuedTokens } from './auth-tokens.service';
import { LoginAttemptsService } from './login-attempts.service';
import { PasswordService } from './password.service';
import {
  PASSWORD_RESET_TTL_MINUTES,
  PasswordTokensService,
} from './password-tokens.service';
import { isIpAllowed } from './admin-ip-allowlist';

// One reset email per account per minute, however often it's requested â€”
// stops the endpoint being used to flood someone's inbox.
const RESET_EMAIL_COOLDOWN_SECONDS = 60;

export interface ClientContext {
  ip?: string;
  userAgent?: string;
}

// Deliberately identical for "no such user" and "wrong password" so the
// login form can't be used to discover which emails/phones are registered.
const INVALID_CREDENTIALS = 'Invalid credentials';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  role: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: AuthTokensService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly passwordTokens: PasswordTokensService,
    private readonly mail: MailService,
  ) {}

  async login(input: LoginInput, client: ClientContext) {
    const identifier = normalizeIdentifier(input.identifier);
    await this.loginAttempts.assertNotLocked(identifier);

    const user = await this.prisma.user.findFirst({
      where: whereIdentifier(identifier),
      select: {
        id: true,
        role: true,
        passwordHash: true,
        isActive: true,
        tokenVersion: true,
        adminProfile: {
          select: { id: true, name: true, allowedIpRange: true },
        },
      },
    });

    if (!user) {
      await this.passwords.burnTime(input.password);
      await this.loginAttempts.recordFailure(identifier);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordOk = await this.passwords.verify(
      input.password,
      user.passwordHash,
    );
    if (!passwordOk) {
      await this.loginAttempts.recordFailure(identifier);
      await this.auditAdmin(user, AuditAction.admin_login_failed, client, {
        reason: 'bad_password',
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Past this point the caller has proven they know the password, so
    // specific reasons are safe to return.
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }
    if (
      user.role !== Role.INVESTOR &&
      !isIpAllowed(client.ip, user.adminProfile?.allowedIpRange)
    ) {
      await this.auditAdmin(user, AuditAction.admin_login_failed, client, {
        reason: 'ip_not_allowed',
      });
      throw new ForbiddenException('Login not permitted from this network');
    }

    await this.loginAttempts.reset(identifier);

    // Transparent upgrade if BCRYPT_ROUNDS has been raised since this
    // password was last set.
    const rehash = this.passwords.needsRehash(user.passwordHash)
      ? await this.passwords.hash(input.password)
      : undefined;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), passwordHash: rehash },
      select: PUBLIC_USER_SELECT,
    });

    const tokens = await this.tokens.issueForNewSession(user, client);
    await this.auditAdmin(user, AuditAction.admin_login, client);

    return { user: updated, tokens };
  }

  async refresh(
    refreshToken: string | undefined,
    client: ClientContext,
  ): Promise<IssuedTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('No session');
    }
    const { user, tokens } = await this.tokens.rotate(refreshToken, client);

    // Same per-request rule JwtStrategy applies: an admin session can't be
    // extended from outside their allowlist.
    if (
      user.role !== Role.INVESTOR &&
      !isIpAllowed(client.ip, user.adminProfile?.allowedIpRange)
    ) {
      await this.tokens.revokeFamilyOf(tokens.refreshToken);
      throw new UnauthorizedException('Access not permitted from this network');
    }
    return tokens;
  }

  // Idempotent and never throws for a bad/missing token: logout must always
  // succeed at clearing the browser, whatever state the session is in.
  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    if (accessToken) {
      const payload = await this.tokens.decodeVerifiedAccessToken(accessToken);
      if (payload?.jti && payload.exp && payload.sub) {
        await this.prisma.blacklistedToken.upsert({
          where: { jti: payload.jti },
          create: {
            jti: payload.jti,
            userId: payload.sub,
            expiresAt: new Date(payload.exp * 1000),
          },
          update: {},
        });
      }
    }
    if (refreshToken) {
      await this.tokens.revokeFamilyOf(refreshToken);
    }
  }

  async logoutEverywhere(userId: string): Promise<void> {
    await this.tokens.revokeAllForUser(userId);
  }

  // Changing the password ends every other session (they might be the
  // reason it's being changed) and starts a fresh one for this browser.
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    client: ClientContext,
  ): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentOk = await this.passwords.verify(
      input.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await this.passwords.hash(input.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    await this.tokens.revokeAllForUser(userId);

    const fresh = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, role: true, tokenVersion: true },
    });
    return this.tokens.issueForNewSession(fresh, client);
  }

  // Always resolves the same way, whether or not the identifier belongs to
  // an account, so the endpoint can't be used to discover who is
  // registered. The email is sent without awaiting it, so a real send
  // doesn't make the response measurably slower than a no-op.
  async forgotPassword(
    input: ForgotPasswordInput,
    client: ClientContext,
  ): Promise<void> {
    const identifier = normalizeIdentifier(input.identifier);
    const user = await this.prisma.user.findFirst({
      where: whereIdentifier(identifier),
      select: { id: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) return;

    const tooSoon = await this.passwordTokens.issuedWithin(
      user.id,
      PasswordTokenPurpose.PASSWORD_RESET,
      RESET_EMAIL_COOLDOWN_SECONDS,
    );
    if (tooSoon) return;

    const link = await this.passwordTokens.issue(
      user.id,
      PasswordTokenPurpose.PASSWORD_RESET,
      client.ip,
    );
    this.mail
      .sendPasswordReset(user.email, link, PASSWORD_RESET_TTL_MINUTES)
      .catch((error: unknown) =>
        this.logger.error(
          `Password reset email to user ${user.id} failed`,
          error as Error,
        ),
      );
  }

  // Completes both "forgot password" and "set password from admin invite".
  // Every existing session is ended: if the reset is happening because the
  // account was compromised, the attacker's sessions must not survive it.
  // The user then logs in normally â€” a reset link is never itself a login.
  async resetPassword(
    input: ResetPasswordInput,
    client: ClientContext,
  ): Promise<void> {
    const claimed = await this.passwordTokens.consume(input.token);
    if (!claimed) {
      throw new BadRequestException(
        'This link is invalid or has expired. Request a new one.',
      );
    }
    const { user, purpose } = claimed;

    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // A locked-out user who just proved control of their email should be
    // able to log in straight away.
    await this.loginAttempts.reset(user.email.toLowerCase());
    if (user.phone) await this.loginAttempts.reset(user.phone);

    await this.auditAdmin(
      user,
      purpose === PasswordTokenPurpose.ACCOUNT_INVITE
        ? AuditAction.admin_invite_accepted
        : AuditAction.admin_password_reset,
      client,
    );
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return user;
  }

  // Stack decision: every admin login (and failed attempt on a real admin
  // account) is audited, as are admin password resets. Never allowed to
  // break the auth flow itself.
  private async auditAdmin(
    user: {
      id: string;
      role: Role;
      adminProfile: { id: string; name: string | null } | null;
    },
    action:
      | typeof AuditAction.admin_login
      | typeof AuditAction.admin_login_failed
      | typeof AuditAction.admin_password_reset
      | typeof AuditAction.admin_invite_accepted,
    client: ClientContext,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    if (user.role === Role.INVESTOR) return;
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          module: LogModule.AUTH,
          status:
            action === AuditAction.admin_login_failed
              ? LogStatus.FAILED
              : LogStatus.SUCCESS,
          severity:
            action === AuditAction.admin_login_failed
              ? LogSeverity.WARNING
              : LogSeverity.INFO,
          targetTable: 'users',
          targetId: user.id,
          targetLabel: user.adminProfile?.name,
          adminProfileId: user.adminProfile?.id,
          adminName: user.adminProfile?.name,
          ipAddress: client.ip,
          userAgent: client.userAgent?.slice(0, 255),
          metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write ${action} audit log`, error as Error);
    }
  }
}

// Emails lowercased so "A@x.com" and "a@x.com" share one lockout counter
// (the DB lookup itself is case-insensitive). Phones are stored as
// +8801XXXXXXXXX (BD_PHONE_REGEX); investors naturally type "017â€¦" or
// "88017â€¦", with spaces/dashes, so those are folded into that format.
function whereIdentifier(identifier: string) {
  return identifier.includes('@')
    ? { email: { equals: identifier, mode: 'insensitive' as const } }
    : { phone: identifier };
}

function normalizeIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();

  const digits = trimmed.replace(/[\s-]/g, '');
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  return digits;
}
