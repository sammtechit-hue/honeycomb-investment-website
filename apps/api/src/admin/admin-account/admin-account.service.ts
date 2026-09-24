import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  AuditAction,
  LogModule,
  PasswordTokenPurpose,
  Prisma,
  Role,
} from '@investment-platform/db';
import type { CreateAdminAccountInput } from '@investment-platform/contracts/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { PasswordService } from '../../auth/password.service';
import {
  ACCOUNT_INVITE_TTL_HOURS,
  PasswordTokensService,
} from '../../auth/password-tokens.service';
import { isValidAllowlist } from '../../auth/admin-ip-allowlist';

const ADMIN_ACCOUNT_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  adminProfile: {
    select: { name: true, department: true, allowedIpRange: true },
  },
} as const;

// Creates staff accounts. The super admin never chooses or sees the new
// admin's password: the account starts with a random, unknowable one and
// the new admin sets their own through an emailed single-use invite link
// (same /reset-password endpoint as forgot-password).
@Injectable()
export class AdminAccountService {
  private readonly logger = new Logger(AdminAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly passwordTokens: PasswordTokensService,
    private readonly mail: MailService,
  ) {}

  async create(input: CreateAdminAccountInput, actorUserId: string, ip?: string) {
    const allowedIpRange = input.allowedIpRange || null;
    if (allowedIpRange && !isValidAllowlist(allowedIpRange)) {
      throw new BadRequestException(
        'allowedIpRange must be comma-separated IPs or CIDR ranges, e.g. "203.0.113.7, 10.20.0.0/16"',
      );
    }

    // The unique index on users.email is case-sensitive; check
    // case-insensitively so "Ops@x.com" can't sit beside "ops@x.com".
    const clash = await this.prisma.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException('An account with this email already exists');
    }

    const unusablePassword = await this.passwords.hash(
      randomBytes(32).toString('base64url'),
    );

    let admin;
    try {
      admin = await this.prisma.user.create({
        data: {
          email: input.email,
          role: input.role as Role,
          passwordHash: unusablePassword,
          adminProfile: {
            create: {
              name: input.name,
              department: input.department || null,
              allowedIpRange,
            },
          },
        },
        select: ADMIN_ACCOUNT_SELECT,
      });
    } catch (error) {
      // Lost a race with a concurrent create for the same email.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }

    const inviteEmailSent = await this.sendInvite(admin.id, admin.email, input.name, ip);
    await this.audit(
      AuditAction.admin_created,
      actorUserId,
      admin,
      { role: admin.role, inviteEmailSent },
      ip,
    );

    return { admin, inviteEmailSent };
  }

  // For when the first invite expired or never arrived. Only for admins who
  // have never logged in — anyone who has should use forgot-password, so
  // this can't be used to reset an active admin's access out from under them.
  async resendInvite(targetUserId: string, actorUserId: string, ip?: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        adminProfile: { select: { name: true } },
      },
    });
    if (!target || target.role === Role.INVESTOR) {
      throw new NotFoundException('Admin account not found');
    }
    if (!target.isActive) {
      throw new ConflictException('This admin account is deactivated');
    }
    if (target.lastLoginAt) {
      throw new ConflictException(
        'This admin has already set a password; they can use "Forgot password" instead',
      );
    }

    const inviteEmailSent = await this.sendInvite(
      target.id,
      target.email,
      target.adminProfile?.name ?? target.email,
      ip,
    );
    await this.audit(
      AuditAction.admin_invite_resent,
      actorUserId,
      target,
      { inviteEmailSent },
      ip,
    );
    return { inviteEmailSent };
  }

  // A failed email doesn't undo the account: it's reported back so the
  // super admin can resend once mail is working.
  private async sendInvite(
    userId: string,
    email: string,
    name: string,
    ip?: string,
  ): Promise<boolean> {
    const link = await this.passwordTokens.issue(
      userId,
      PasswordTokenPurpose.ACCOUNT_INVITE,
      ip,
    );
    try {
      await this.mail.sendAdminInvite(email, name, link, ACCOUNT_INVITE_TTL_HOURS);
      return true;
    } catch (error) {
      this.logger.error(`Invite email to user ${userId} failed`, error as Error);
      return false;
    }
  }

  private async audit(
    action:
      | typeof AuditAction.admin_created
      | typeof AuditAction.admin_invite_resent,
    actorUserId: string,
    target: { id: string; email: string },
    metadata: Prisma.InputJsonObject,
    ip?: string,
  ) {
    const actor = await this.prisma.adminProfile.findUnique({
      where: { userId: actorUserId },
      select: { id: true, name: true },
    });
    await this.prisma.auditLog.create({
      data: {
        action,
        module: LogModule.AUTH,
        targetTable: 'users',
        targetId: target.id,
        targetLabel: target.email,
        adminProfileId: actor?.id,
        adminName: actor?.name,
        ipAddress: ip,
        metadata,
      },
    });
  }
}
