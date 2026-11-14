import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  LogModule,
  LogSeverity,
  LogStatus,
  Prisma,
} from '@investment-platform/db';
import type { ReferralCodeQuery } from '@investment-platform/contracts/referralCode';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { ReferralCodeQueryDto } from './dto/query-referral-code.dto';
import { UpdateReferralCodeDto } from './dto/update-referral-code.dto';

const REFERRAL_CODE_SELECT = {
  id: true,
  code: true,
  isUsed: true,
  isActive: true,
  // Who owns the code and, when used, who used it.
  referrer: {
    select: { id: true, fullname: true },
  },
  referred: {
    select: { id: true, fullname: true },
  },
  createdAt: true,
  expiresAt: true,
  usedAt: true,
} as const satisfies Prisma.ReferralCodeSelect;

// The update response and audit snapshots also need the scalar foreign keys.
const REFERRAL_CODE_UPDATE_SELECT = {
  ...REFERRAL_CODE_SELECT,
  referrerId: true,
  referredId: true,
} as const satisfies Prisma.ReferralCodeSelect;

type ReferralCodeForAudit = Prisma.ReferralCodeGetPayload<{
  select: typeof REFERRAL_CODE_UPDATE_SELECT;
}>;

@Injectable()
export class ReferralCodeService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly sortColumns = {
    code: 'code',
    isUsed: 'isUsed',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    usedAt: 'usedAt',
  } as const satisfies Record<
    Exclude<ReferralCodeQuery['sortBy'], 'referrerId'>,
    keyof Prisma.ReferralCodeOrderByWithRelationInput
  >;

  // Example: GET /api/admin/referral-code?search=ABC123&referrerId=&referredId=
  //   &isUsed=false&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  async findAllReferralCode(query: ReferralCodeQueryDto) {
    const {
      search,
      referrerId,
      referredId,
      isUsed,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.ReferralCodeWhereInput = {
      ...(referrerId && { referrerId }),
      ...(referredId && { referredId }),
      ...(isUsed !== undefined && { isUsed }),
      ...(search && {
        OR: [
          // The code itself (e.g. ABC123) is the common lookup.
          { code: { contains: search, mode: 'insensitive' } },
          // Who referred, or who was referred, matched by full name.
          { referrer: { fullname: { contains: search, mode: 'insensitive' } } },
          { referred: { fullname: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    // `referrerId` in the contract means "sort by the referrer investor name";
    // UUID order would be meaningless to an admin. The id tie-breaker keeps
    // pages deterministic.
    const orderBy: Prisma.ReferralCodeOrderByWithRelationInput[] =
      sortBy === 'referrerId'
        ? [{ referrer: { fullname: sortOrder } }, { id: 'asc' }]
        : buildOrderBy<Prisma.ReferralCodeOrderByWithRelationInput>(
            this.sortColumns[sortBy],
            sortOrder,
          );

    // Reuse the fetch function — current page and total count in parallel.
    const [referralCodes, total] = await fetchData(
      this.prisma.referralCode,
      where,
      orderBy,
      page,
      limit,
      { select: REFERRAL_CODE_SELECT },
    );

    return {
      message: 'Referral codes fetched successfully',
      success: true,
      data: referralCodes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // PATCH /api/admin/referral-code/:id — partial update.
  async updateReferralCode(
    id: string,
    dto: UpdateReferralCodeDto,
    userId?: string,
    context?: RequestAuditContext,
  ) {
    const { expiresAt } = dto;

    // Prisma skips `undefined` keys, so only fields the client sent are written.
    const data: Prisma.ReferralCodeUpdateInput = {
      expiresAt,
    };

    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException('No fields provided to update');
    }

    // For the audit log: who is acting, and the row as it stands before the edit.
    const [adminProfile, existingReferralCode] = await Promise.all([
      userId
        ? this.prisma.adminProfile.findUnique({
            where: { userId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      this.prisma.referralCode.findUnique({
        where: { id },
        select: REFERRAL_CODE_UPDATE_SELECT,
      }),
    ]);

    if (!adminProfile) {
      throw new NotFoundException('Admin profile not found');
    }

    if (!existingReferralCode) {
      throw new NotFoundException(`Referral code with id ${id} not found`);
    }

    try {
      // The row and its audit trail are written together or not at all.
      const referralCode = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.referralCode.update({
          where: { id },
          data,
          select: REFERRAL_CODE_UPDATE_SELECT,
        });

        await tx.auditLog.create({
          data: {
            adminName: adminProfile.name ?? 'Admin',
            adminProfileId: adminProfile.id,
            action: AuditAction.referral_code_updated,
            module: LogModule.REFERRAL,
            severity: LogSeverity.INFO,
            status: LogStatus.SUCCESS,
            targetLabel: `Referral Code Updated: ${updated.code}`,
            targetTable: 'referral_codes',
            targetId: updated.id,
            oldValue: toReferralCodeSnapshot(existingReferralCode),
            newValue: toReferralCodeSnapshot(updated),
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
            sessionId: context?.sessionId ?? null,
          },
        });

        return updated;
      });

      return {
        message: 'Referral code updated successfully',
        success: true,
        data: referralCode,
      };
    } catch (err) {
      // Only translate the Prisma errors we can explain; anything else is a 500.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(`Referral code with id ${id} not found`);
      }
      throw err;
    }
  }
}

// Referral code scalars only, JSON-ready: Dates as ISO strings.
function toReferralCodeSnapshot(
  referralCode: ReferralCodeForAudit,
): Prisma.InputJsonObject {
  return {
    id: referralCode.id,
    code: referralCode.code,
    referrerId: referralCode.referrerId,
    referredId: referralCode.referredId,
    isUsed: referralCode.isUsed,
    isActive: referralCode.isActive,
    createdAt: referralCode.createdAt.toISOString(),
    expiresAt: referralCode.expiresAt.toISOString(),
    usedAt: referralCode.usedAt ? referralCode.usedAt.toISOString() : null,
  };
}
