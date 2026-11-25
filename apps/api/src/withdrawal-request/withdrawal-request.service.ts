import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdminNotificationType,
  InvestmentStatus,
  Prisma,
  WithdrawalStatus,
} from '@investment-platform/db';
import type {
  WithdrawalRequestCreateInput,
  WithdrawalRequestQuery,
} from '@investment-platform/contracts/withdrawal-request';
import { PrismaService } from '../prisma/prisma.service';
import {
  addDays,
  getDhakaDateOnly,
} from '../utils/common/bangladeshTime.util';
import { buildOrderBy } from '../utils/common/build-order-by.util';
import { fetchData } from '../utils/common/fetchData.util';
import { findInvestorId } from '../utils/common/investor.utils';
import { withdrawalNoticeDays } from '../utils/common/roi-schedule.util';

const OPEN_WITHDRAWAL_STATUSES = [
  WithdrawalStatus.pending,
  WithdrawalStatus.notice_period,
  WithdrawalStatus.ready,
];


const WITHDRAWAL_REQUEST_LIST_SELECT = {
  id: true,
  investmentId: true,
  requestedAmount: true,
  requestDate: true,
  noticePeriodDays: true,
  noticePeriodEnd: true,
  disbursementDate: true,
  // Admin-facing reasons, both shown to the investor.
  overrideReason: true,
  cancelReason: true,
  status: true,
  createdAt: true,
  investment: {
    select: {
      id: true,
      amount: true,
      status: true,
      project: { select: { name: true} },
      projectId: true,
    },
  },
} satisfies Prisma.WithdrawalRequestSelect;

@Injectable()
export class WithdrawalRequestService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    private readonly prisma: PrismaService,
  ) {}

  // --------------------------------------------------------
  // ------------------------ FindAll WithdrawalRequest -----
  //---------------------------------------------------------
  // Example: GET /api/withdrawal-request?search=&investmentId=&status=pending
  //   &withdrawalMethod=auto&min=&max=&requestDateFrom=&requestDateTo=
  //   &page=1&limit=10&sortBy=requestDate&sortOrder=desc
  async findAllWithdrawalRequest(
    query: WithdrawalRequestQuery,
    userId: string | undefined,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    // Investor-facing routes are always scoped to the logged-in investor.
    const investorId = await findInvestorId(this.prisma, userId);

    const {
      search,
      investmentId,
      status,
      withdrawalMethod,
      // min,
      // max,
      requestDateFrom,
      requestDateTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.WithdrawalRequestWhereInput = {
      investment: {
        investorId,
        // Free-text search over the project of the caller's own investments.
        ...(search && {
          project: { name: { contains: search, mode: 'insensitive' } },
        }),
      },
      ...(investmentId && { investmentId }),
      ...(status && { status }),
      ...(withdrawalMethod && { withdrawalMethod }),

      // Requested amount range (both ends inclusive).
      // ...((min !== undefined || max !== undefined) && {
      //   requestedAmount: {
      //     ...(min !== undefined && { gte: min }),
      //     ...(max !== undefined && { lte: max }),
      //   },
      // }),
      // Request date range (both ends inclusive).
      ...((requestDateFrom !== undefined || requestDateTo !== undefined) && {
        requestDate: {
          ...(requestDateFrom !== undefined && { gte: requestDateFrom }),
          ...(requestDateTo !== undefined && { lte: requestDateTo }),
        },
      }),
    };

    // Every sortBy value in the contract is a plain WithdrawalRequest column;
    // buildOrderBy adds the id tie-breaker that keeps paging deterministic.
    const orderBy = buildOrderBy<Prisma.WithdrawalRequestOrderByWithRelationInput>(
      sortBy,
      sortOrder,
    );

    // Current page and total count in parallel.
    const [withdrawalRequests, total] = await fetchData(
      this.prisma.withdrawalRequest,
      where,
      orderBy,
      page,
      limit,
      { select: WITHDRAWAL_REQUEST_LIST_SELECT },
    );

    return {
      message: 'Withdrawal requests fetched successfully',
      success: true,
      data: withdrawalRequests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --------------------------------------------------------
  // ------------------------ FindOne WithdrawalRequest -----------------------
  //---------------------------------------------------------
  // For Getting One WithdrawalRequest's Data
  async findOneWithdrawalRequest(id: string) {
    return id + 'This route is for WithdrawalRequest who will see their necessary data and partially modify data';
  }

  // --------------------------------------------------------
  // ------------------------- Create WithdrawalRequest -----------------------
  //---------------------------------------------------------
  async createWithdrawalRequest(
    createWithdrawalRequestDto: WithdrawalRequestCreateInput,
    userId: string | undefined,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const requestedAmount = new Prisma.Decimal(
      createWithdrawalRequestDto.requestedAmount,
    );

    const investment = await this.prisma.investment.findUnique({
      where: { id: createWithdrawalRequestDto.investmentId },
      select: {
        id: true,
        amount: true,
        status: true,
        investor: { select: { userId: true, fullname: true } },
      },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    
    if (investment.investor.userId !== userId) {
      throw new ForbiddenException('Invalid user!');
    }


    if (requestedAmount.gt(investment.amount)) {
      throw new BadRequestException(
        'Requested amount cannot exceed the invested amount.',
      );
    }

    // Need to check this investment has any pending withdrawal Request
    const openRequest = await this.prisma.withdrawalRequest.findFirst({
      where: {
        investmentId: investment.id,
        status: { in: OPEN_WITHDRAWAL_STATUSES },
      },
      select: { id: true },
    });

    if (openRequest) {
      throw new ConflictException(
        'A withdrawal request for this investment is already in progress.',
      );
    }

    // 2026-11-24
    const requestDate = getDhakaDateOnly();
    const noticePeriodDays = withdrawalNoticeDays(requestedAmount);
    const noticePeriodEnd = addDays(requestDate, noticePeriodDays);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const withdrawalRequest = await tx.withdrawalRequest.create({
          data: {
            requestedAmount,
            requestDate,
            noticePeriodDays,
            noticePeriodEnd,
            status: WithdrawalStatus.pending,
            investment: { connect: { id: investment.id } },
          },
          select: {
            id: true,
            investmentId: true,
            requestedAmount: true,
            withdrawalMethod: true,
            requestDate: true,
            noticePeriodDays: true,
            noticePeriodEnd: true,
            status: true,
            createdAt: true,
          },
        });

        await tx.adminNotification.create({
          data: {
            type: 'investor_action' as AdminNotificationType,
            referenceId: withdrawalRequest.id,
            // AdminNotification.message is VARCHAR(255).
            message: `New withdrawal request: ${investment.investor.fullname} — ${requestedAmount.toFixed(2)}`.slice(
              0,
              255,
            ),
            isRead: false,
            clickLink: `/admin/withdrawal-request/${withdrawalRequest.id}`,
          },
        });

        return {
          message: 'Withdrawal Request Created Successfully',
          success: true,
          data: withdrawalRequest,
        };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'One or more referenced records do not exist.',
        );
      }
      throw err;
    }
  }

  // --------------------------------------------------------
  // ------------------------ Cancel WithdrawalRequest -----------------------
  //---------------------------------------------------------
  // PATCH /api/withdrawal-request
  async cancelWithdrawalRequest(userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const investorId = await findInvestorId(this.prisma, userId);

    // 1. Read — the investor's pending request. An investor may cancel only
    //    while the request is still pending; once it moves on
    //    (notice_period, ready, ...) an admin handles it instead.
    const existingWithdrawalRequest =
      await this.prisma.withdrawalRequest.findFirst({
        where: {
          investment: { investorId },
          status: WithdrawalStatus.pending,
        },
        // An investor has at most one pending request per investment; the
        // newest one is the one they are cancelling.
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          requestedAmount: true,
          investment: {
            select: {
              investor: { select: { fullname: true } },
            },
          },
        },
      });

    if (!existingWithdrawalRequest) {
      throw new NotFoundException(
        'No pending withdrawal request found to cancel',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const cancelledRequest = await tx.withdrawalRequest.update({
          where: {
            id: existingWithdrawalRequest.id,
            status: WithdrawalStatus.pending,
          },
          data: { status: WithdrawalStatus.cancelled },
          select: WITHDRAWAL_REQUEST_LIST_SELECT,
        });

        await tx.adminNotification.create({
          data: {
            type: 'investor_action' as AdminNotificationType,
            referenceId: cancelledRequest.id,
            // AdminNotification.message is VARCHAR(255).
            message: `Withdrawal request cancelled by ${existingWithdrawalRequest.investment.investor.fullname} — ${existingWithdrawalRequest.requestedAmount.toFixed(2)}`.slice(
              0,
              255,
            ),
            isRead: false,
            clickLink: `/admin/withdrawal-request/${cancelledRequest.id}`,
          },
        });

        return {
          message: 'Withdrawal request cancelled successfully',
          success: true,
          data: cancelledRequest,
        };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new ConflictException(
          'This withdrawal request is no longer cancellable.',
        );
      }
      throw err;
    }
  }

  // --------------------------------------------------------
  // ------------------------- Remove WithdrawalRequest -----
  //---------------------------------------------------------
  // For deleting WithdrawalRequest
  async removeWithdrawalRequest(id: string) {
    return {
      message: 'WithdrawalRequest Deleted Successfully',
    };
  }
}
