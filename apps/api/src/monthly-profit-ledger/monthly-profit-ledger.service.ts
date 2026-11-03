import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  MonthlyProfitLedgerQuery,
} from '@investment-platform/contracts/monthlyProfitLedger';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { MonthlyProfitLedgerQueryDto } from './dto/query-monthly-profit-ledger.dto';
import { buildOrderBy } from '../utils/common/build-order-by.util';
import { fetchData } from '../utils/common/fetchData.util';
import { findInvestorId } from '../utils/common/investor.utils'
import { buildMonthlyProfitLedgerWhere } from '../utils/common/monthly-profit-ledgerWhereQuery.util';

@Injectable()
export class MonthlyProfitLedgerService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }


  private readonly sortColumns = {
    periodMonth: 'cycleEnd',
    rateApplied: 'rateApplied',
    profitAmount: 'profitAmount',
    payoutStatus: 'payoutStatus',
  } as const satisfies Record<
    MonthlyProfitLedgerQuery['sortBy'],
    keyof Prisma.MonthlyProfitLedgerOrderByWithRelationInput
  >;

  //-----------------------------------------------------------------
  // For Getting All MonthlyProfitLedger's Data of an Investor
  //-----------------------------------------------------------------
  // Example: GET /api/monthly-profit-ledger?investmentId=&payoutStatus=accrued
  //   &min=&max=&periodFrom=&periodTo=&page=1&limit=10&sortBy=periodMonth&sortOrder=desc
  async findInvestorAllMonthlyProfitLedger(
    query: MonthlyProfitLedgerQueryDto,
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
      payoutStatus,
      min,
      max,
      periodFrom,
      periodTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;


    const where = buildMonthlyProfitLedgerWhere({
      investorId,
      investmentId,
      search,
      payoutStatus,
      min,
      max,
      periodFrom,
      periodTo,
    });

    // Reuse the Order function
    const orderBy =
      buildOrderBy<Prisma.MonthlyProfitLedgerOrderByWithRelationInput>(
        this.sortColumns[sortBy],
        sortOrder,
      );

    // Reuse the fetch function — current page and total count in parallel.
    const [ledgers, total] = await fetchData(
      this.prisma.monthlyProfitLedger,
      where,
      orderBy,
      page,
      limit,
    );

    return {
      message: 'Monthly profit ledgers fetched successfully',
      success: true,
      data: ledgers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
