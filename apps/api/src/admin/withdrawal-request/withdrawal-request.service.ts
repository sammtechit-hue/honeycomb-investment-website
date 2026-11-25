import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WithdrawalStatus } from '@investment-platform/db';
import type {
  UpdateWithdrawalRequestInput,
  WithdrawalRequestCreateInput,
  WithdrawalRequestQuery,
} from '@investment-platform/contracts/withdrawal-request';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays } from '../../utils/common/bangladeshTime.util';
import { fetchData } from '../../utils/common/fetchData.util';

// Fields returned by both admin withdrawal-request endpoints (list + detail),
// so the two views can never drift apart.
const WITHDRAWAL_REQUEST_ADMIN_SELECT = {
  id: true,
  requestedAmount: true,
  withdrawalMethod: true,
  requestDate: true,
  noticePeriodDays: true,
  noticePeriodEnd: true,
  disbursementDate: true,
  overrideReason: true,
  reviewedBy: true,
  reviewedAt: true,
  cancelReason: true,
  finalRoiDays: true,
  finalRoiAmount: true,
  status: true,
  investmentId: true,
  paidDisbursementItemId: true,
  createdAt: true,
  updatedAt: true,
  // The investment (and its investor / project) the money is withdrawn from.
  investment: {
    select: {
      id: true,
      amount: true,
      status: true,
      investmentDate: true,
      investorId: true,
      investor: {
        select: {
          fullname: true,
          user: { select: { email: true, phone: true } },
        },
      },
      project: { select: { id: true, name: true } },
    },
  },
  // The disbursement item that eventually paid this request, if any.
  paidDisbursementItem: {
    select: {
      id: true,
      reason: true,
      amount: true,
      isDisbursed: true,
      batchId: true,
    },
  },
} satisfies Prisma.WithdrawalRequestSelect;

// The only status moves an admin may make. Terminal statuses map to an empty
// list: once a request is paid, cancelled or rejected it cannot be edited.
const ADMIN_WITHDRAWAL_TRANSITIONS: Record<
  WithdrawalStatus,
  readonly WithdrawalStatus[]
> = {
  [WithdrawalStatus.pending]: [
    WithdrawalStatus.notice_period,
    WithdrawalStatus.rejected,
    WithdrawalStatus.cancelled,
  ],
  [WithdrawalStatus.notice_period]: [
    WithdrawalStatus.ready,
    WithdrawalStatus.cancelled,
  ],
  [WithdrawalStatus.ready]: [WithdrawalStatus.cancelled],
  [WithdrawalStatus.paid]: [],
  [WithdrawalStatus.cancelled]: [],
  [WithdrawalStatus.rejected]: [],
};

const FINALIZED_WITHDRAWAL_STATUSES = new Set<WithdrawalStatus>([
  WithdrawalStatus.paid,
  WithdrawalStatus.cancelled,
  WithdrawalStatus.rejected,
]);

// Fields returned by the admin update endpoint — no internal relations.
const WITHDRAWAL_REQUEST_UPDATE_SELECT = {
  id: true,
  status: true,
  requestedAmount: true,
  noticePeriodDays: true,
  noticePeriodEnd: true,
  overrideReason: true,
  cancelReason: true,
  disbursementDate: true,
  finalRoiDays: true,
  finalRoiAmount: true,
  reviewedBy: true,
  reviewedAt: true,
  updatedAt: true,
} satisfies Prisma.WithdrawalRequestSelect;

@Injectable()
export class WithdrawalRequestService {
  constructor(private readonly prisma: PrismaService) { }

  // -----------------------------------------------------------------------------
  // -------------------------- FindAll Withdrawal Request -----------------------
  // -----------------------------------------------------------------------------
  // For Getting All WithdrawalRequest's Data with filtering, searching, sorting & pagination
  // Example: GET /admin/withdrawal-request?status=pending&withdrawalMethod=manual&page=1&limit=10
  // Validated/normalized by WithdrawalRequestQueryDto — all fields are typed.
  async findAllWithdrawalRequest(query: WithdrawalRequestQuery) {
    const {
      search,
      investmentId,
      status,
      withdrawalMethod,
      min,
      max,
      requestDateFrom,
      requestDateTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    // 1. WHERE — only the filters the caller actually sent are applied;
    //    omitted keys are skipped (no accidental `null` matches).
    const where: Prisma.WithdrawalRequestWhereInput = {
      ...(investmentId && { investmentId }),
      ...(status && { status }),
      ...(withdrawalMethod && { withdrawalMethod }),
      // Requested amount range (both ends inclusive).
      ...((min !== undefined || max !== undefined) && {
        requestedAmount: {
          ...(min !== undefined && { gte: min }),
          ...(max !== undefined && { lte: max }),
        },
      }),
      // Request date range (both ends inclusive).
      ...((requestDateFrom !== undefined || requestDateTo !== undefined) && {
        requestDate: {
          ...(requestDateFrom !== undefined && { gte: requestDateFrom }),
          ...(requestDateTo !== undefined && { lte: requestDateTo }),
        },
      }),
      // Free-text search over the related investment's investor / project.
      ...(search && {
        OR: [
          {
            investment: {
              investor: {
                fullname: { contains: search, mode: 'insensitive' },
              },
            },
          },
          {
            investment: {
              investor: {
                user: { email: { contains: search, mode: 'insensitive' } },
              },
            },
          },
          {
            investment: {
              investor: {
                user: { phone: { contains: search, mode: 'insensitive' } },
              },
            },
          },
          {
            investment: {
              project: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      }),
    };

    // Every sortBy value is a direct WithdrawalRequest column.
    const orderBy: Prisma.WithdrawalRequestOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      // Tie-breaker on id keeps pagination deterministic.
      { id: 'asc' as const },
    ];

    // Reuse the fetch function — current page and total count in parallel.
    const [withdrawalRequests, total] = await fetchData(
      this.prisma.withdrawalRequest,
      where,
      orderBy,
      page,
      limit,
      { select: WITHDRAWAL_REQUEST_ADMIN_SELECT },
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

  // ----------------------------------------------------------------------------
  // -------------------------- FindOne Withdrawal Request-----------------------
  // ----------------------------------------------------------------------------
  // For Getting One WithdrawalRequest's Data
  async findOneWithdrawalRequest(id: string) {
    const withdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      select: WITHDRAWAL_REQUEST_ADMIN_SELECT,
    });

    if (!withdrawalRequest) {
      throw new NotFoundException(
        `Withdrawal request with id ${id} not found`,
      );
    }

    return {
      message: 'Withdrawal request fetched successfully',
      success: true,
      data: withdrawalRequest,
    };
  }

  // For Creating WithdrawalRequest
  // Validated by CreateWithdrawalRequestDto — see
  // packages/contracts/src/withdrawal-request.ts.
  async createWithdrawalRequest(createWithdrawalRequestDto: WithdrawalRequestCreateInput) {
    return {
      message: 'WithdrawalRequest Created Successfully',
      data: createWithdrawalRequestDto,
    };
  }

  // ----------------------------------------------------------------------------
  // -------------------------- Update Withdrawal Request -----------------------
  // ----------------------------------------------------------------------------
  // PATCH /api/admin/withdrawal-request/:id
  async updateWithdrawalRequest(
    id: string,
    updateWithdrawalRequestDto: UpdateWithdrawalRequestInput,
    adminUserId?: string,
  ) {
    // 1. Read — the current state of withdrawalRequest.
    const existingWithdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requestDate: true,
        noticePeriodDays: true,
        noticePeriodEnd: true,
      },
    });

    if (!existingWithdrawalRequest) {
      throw new NotFoundException(
        `Withdrawal request with id ${id} not found`,
      );
    }

    // 2. Validate — finalized requests are read-only.
    // WithdrawalStatus.paid,
    // WithdrawalStatus.cancelled,
    // WithdrawalStatus.rejected,
    if (FINALIZED_WITHDRAWAL_STATUSES.has(existingWithdrawalRequest.status)) {
      throw new ConflictException(
        `Withdrawal request is already ${existingWithdrawalRequest.status} and can no longer be edited.`,
      );
    }

    // Only a move listed in the map is accepted; sending the current
    // status again is a no-op, not a transition.
    const nextStatus = updateWithdrawalRequestDto.status ?? existingWithdrawalRequest.status;

    if (nextStatus !== existingWithdrawalRequest.status) {
      const allowed = ADMIN_WITHDRAWAL_TRANSITIONS[existingWithdrawalRequest.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new ConflictException(
          `Cannot change withdrawal request status from ${existingWithdrawalRequest.status} to ${nextStatus}.`,
        );
      }
    }

    // A changed notice period must be explained to the investor.
    const noticeChanged =
      updateWithdrawalRequestDto.noticePeriodDays !== undefined &&
      updateWithdrawalRequestDto.noticePeriodDays !==
      existingWithdrawalRequest.noticePeriodDays;

    if (noticeChanged && !updateWithdrawalRequestDto.overrideReason) {
      throw new BadRequestException(
        'overrideReason is required when changing the notice period.',
      );
    }

    // noticePeriodEnd is never accepted from the client; it is always
    // derived from requestDate + noticePeriodDays so the two stay
    // consistent.
    const noticePeriodDays =
      updateWithdrawalRequestDto.noticePeriodDays ?? existingWithdrawalRequest.noticePeriodDays;

    // 2026-11-24
    const noticePeriodEnd =
      updateWithdrawalRequestDto.noticePeriodDays !== undefined
        ? addDays(existingWithdrawalRequest.requestDate, noticePeriodDays)
        : existingWithdrawalRequest.noticePeriodEnd;

      
    // 1798070400000 
    // converts a Date object into a number
    if (noticePeriodEnd.getTime() < existingWithdrawalRequest.requestDate.getTime()) {
      throw new BadRequestException(
        'Notice Period End Date cannot be earlier than Request Date',
      );
    }

    // Used for review by, review at
    const enteringNoticePeriod =
      nextStatus === WithdrawalStatus.notice_period &&
      existingWithdrawalRequest.status !== WithdrawalStatus.notice_period;

    try {
      // 3. Update — scoped to the status we validated so a concurrent
      // change cannot be overwritten.
      const updated = await this.prisma.$transaction(async (tx) => {
        return tx.withdrawalRequest.update({
          where: { id, status: existingWithdrawalRequest.status },
          data: {
            ...(updateWithdrawalRequestDto.requestedAmount !== undefined && {
              requestedAmount: new Prisma.Decimal(
                updateWithdrawalRequestDto.requestedAmount,
              ),
            }),
            ...(updateWithdrawalRequestDto.withdrawalMethod !== undefined && {
              withdrawalMethod: updateWithdrawalRequestDto.withdrawalMethod,
            }),
            ...(updateWithdrawalRequestDto.disbursementDate !== undefined && {
              disbursementDate: updateWithdrawalRequestDto.disbursementDate,
            }),
            ...(updateWithdrawalRequestDto.overrideReason !== undefined && {
              overrideReason: updateWithdrawalRequestDto.overrideReason,
            }),
            ...(updateWithdrawalRequestDto.cancelReason !== undefined && {
              cancelReason: updateWithdrawalRequestDto.cancelReason,
            }),
            ...(updateWithdrawalRequestDto.noticePeriodDays !== undefined && {
              noticePeriodDays,
              noticePeriodEnd,
            }),
            status: nextStatus,
            // Review audit — set once, when the request enters notice_period.
            ...(enteringNoticePeriod &&
              adminUserId && {
                reviewedBy: adminUserId,
                reviewedAt: new Date(),
              }),
          },
          select: WITHDRAWAL_REQUEST_UPDATE_SELECT,
        });
      });

      return {
        message: 'Withdrawal request updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new ConflictException(
          'This withdrawal request changed while it was being updated. Reload and try again.',
        );
      }
      throw err;
    }
  }

  // For deleting WithdrawalRequest
  async removeWithdrawalRequest(id: string) {
    return {
      message: 'WithdrawalRequest Deleted Successfully',
    };
  }
}
