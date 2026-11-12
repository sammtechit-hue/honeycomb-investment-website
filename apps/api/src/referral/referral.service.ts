import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@investment-platform/db';
import type { ReferralQuery } from '@investment-platform/contracts/referral';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralQueryDto } from './dto/query-referral.dto';
import { buildOrderBy } from '../utils/common/build-order-by.util';

// Fields returned by the referral list endpoint. Explicit select (never bare
// include) so investor relations can't leak credential / KYC / bank fields.
const REFERRAL_LIST_SELECT = {
  id: true,
  bonusPercent: true,
  // Referral bonus amount.
  bonusAmount: true,
  createdAt: true,
  // Which code was used.
  referralCode: {
    select: { id: true, code: true },
  },
  // Who referred.
  referrer: {
    select: { id: true, fullname: true },
  },
  // Who was referred.
  referredInvestor: {
    select: { id: true, fullname: true },
  },
} as const satisfies Prisma.ReferralSelect;

@Injectable()
export class ReferralService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    private readonly prisma: PrismaService,
  ) { }

  private readonly sortColumns = {
    bonusAmount: 'bonusAmount',
    createdAt: 'createdAt',
  } as const satisfies Record<
    ReferralQuery['sortBy'],
    keyof Prisma.ReferralOrderByWithRelationInput
  >;

  // For getting all Referral's data with filtering, searching, sorting & pagination.
  // Example: GET /api/referral?search=ABC123&referrerId=&referredInvestorId=
  //   &referralCodeId=&minBonusAmount=&maxBonusAmount=&fromDate=&toDate=
  //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
  async findAllReferral(query: ReferralQueryDto, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    // Referral.referrerId references Investor.id, not User.id.
    const investor = await this.prisma.investor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!investor) {
      throw new ForbiddenException(
        'Complete your investor profile before viewing referrals.',
      );
    }

    const {
      referredInvestorId,
      referralCodeId,
      minBonusAmount,
      maxBonusAmount,
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.ReferralWhereInput = {
      referrerId: investor.id,
      ...(referredInvestorId && { referredInvestorId }),
      ...(referralCodeId && { referralCodeId }),
      ...((minBonusAmount !== undefined || maxBonusAmount !== undefined) && {
        bonusAmount: {
          ...(minBonusAmount !== undefined && { gte: minBonusAmount }),
          ...(maxBonusAmount !== undefined && { lte: maxBonusAmount }),
        },
      }),
      ...((fromDate !== undefined || toDate !== undefined) && {
        createdAt: {
          ...(fromDate !== undefined && { gte: fromDate }),
          ...(toDate !== undefined && { lte: toDate }),
        },
      }),
    };

    // Reuse the Order function.
    const orderBy = buildOrderBy<Prisma.ReferralOrderByWithRelationInput>(
      this.sortColumns[sortBy],
      sortOrder,
    );

    // Current page and total count in parallel.
    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        select: REFERRAL_LIST_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return {
      message: 'Referrals fetched successfully',
      success: true,
      data: referrals,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // For Getting One Referral's Data
  async findOne(id: string) {
    return (
      id +
      'This route is for Referral who will see their necessary data and partially modify data'
    );
  }
}
