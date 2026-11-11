
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    MonthlyProfitLedgerQuery,
    MonthlyProfitLedgerUpdateInput,
} from '@investment-platform/contracts/monthlyProfitLedger';
import { PrismaService } from '../../prisma/prisma.service';
import type { Env } from '../../config/env';

import {
    InvestmentType,
    Prisma,
    AdminNotificationType,
} from '@investment-platform/db';
import { findInvestorId } from '../../utils/common/investor.utils'
import { MonthlyProfitLedgerQueryDto } from './dto/query-monthly-profit-ledger.dto';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { buildMonthlyProfitLedgerWhere } from '../../utils/common/monthly-profit-ledgerWhereQuery.util';
import { addDays, fmt, getDhakaDateOnly, toDateOnly, toOrd } from '../../utils/common/bangladeshTime.util';


const ROUND_HALF_UP = 4; //তৃতীয় ঘরের সংখ্যা ৫ বা তার বেশি হলে দ্বিতীয় ঘর বাড়াবে।

function computeProfit(
    amount: Prisma.Decimal,
    ratePercent: Prisma.Decimal,
    days: number,
): Prisma.Decimal {
    return amount
        .mul(ratePercent)
        .div(100)
        .mul(days)
        .div(30)
        .toDecimalPlaces(2, ROUND_HALF_UP);
}

@Injectable()
export class MonthlyProfitLedgerService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService<Env, true>,
    ) { }

    private result(
        created: number,
        skipped: number,
        cycleEnd: Date,
    ) {
        return {
            message:
                `Profit cycle ending ${fmt(cycleEnd)}: ` +
                `${created} created, ${skipped} skipped`,
            success: true,
            data: { created, skipped },
        };
    }

    private readonly sortColumns = {
        periodMonth: 'cycleEnd',
        rateApplied: 'rateApplied',
        profitAmount: 'profitAmount',
        payoutStatus: 'payoutStatus',
    } as const satisfies Record<
        MonthlyProfitLedgerQuery['sortBy'],
        keyof Prisma.MonthlyProfitLedgerOrderByWithRelationInput
    >;


    async findAllMonthlyLedger(query: MonthlyProfitLedgerQuery) {
        return {
            message: "HelloWorld Return all MonthlyProfitLedger's data",
            query,
        };
    }

    // ------------------------------------------------------------
    // ---------------------- FindOneMonthlyLedger ----------------
    //-------------------------------------------------------------
    async findOneMonthlyLedger(
        id: string,
        userId: string | undefined,
        query: MonthlyProfitLedgerQueryDto,
    ) {
        if (!userId) {
            throw new UnauthorizedException('Session is no longer valid');
        }

        // Investor-facing routes are always scoped to the logged-in investor.
        const investorId = await findInvestorId(this.prisma, id);

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


    //-----------------------------------------------------------------
    // For creating All MonthlyProfitLedger's Data for every Investor
    //-----------------------------------------------------------------
    async createMonthlyLedger() {
        const today = getDhakaDateOnly();

        // Must run on the 11th (Bangladesh date).
        // Fetch setcycleday from the active BusinessSettings row.
        const settings = await this.prisma.businessSettings.findFirst({
            where: { isActive: true },
            select: { setcycleday: true, countingStartAfterDays: true },
        });

        if (!settings?.setcycleday) {
            throw new NotFoundException(
                'No active BusinessSettings row found — cycle day is not configured',
            );
        }

        const setcycleday = settings.setcycleday;

        if (today.getUTCDate() !== setcycleday) {
            throw new BadRequestException(
                `Profit cycle job must run on the ${setcycleday}th (got ${today.getUTCDate()}th)`,
            );
        }

        // Example: October 11
        // cycleStart = September 11
        // cycleEnd   = October 10
        const cycleEnd = addDays(today, -1);

        // Standard cycle starts on the 11th of the previous month.
        const standardCycleStart = new Date(
            Date.UTC(
                cycleEnd.getUTCFullYear(),
                cycleEnd.getUTCMonth() - 1,
                setcycleday,
            ),
        );

        // Fetch all active investments.
        const investments = await this.prisma.investment.findMany({
            where: { status: 'active' },
            select: {
                id: true,
                amount: true,
                investmentType: true,
                investmentDate: true,
                rate: true,
            },
        });

        if (investments.length === 0) {
            return this.result(0, 0, cycleEnd);
        }

        // Previous month.
        const previousMonth = new Date(
            Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth() - 1,
                1,
            ),
        );

        const monthlyRateRows =
            await this.prisma.monthlyRateSetting.findFirst({
                where: {
                    periodMonth: previousMonth,
                },
                select: {
                    periodMonth: true,
                    ratePercent: true,
                },
            });

        if (!monthlyRateRows?.ratePercent) {
            throw new NotFoundException(
                `Monthly rate not found for ${previousMonth.toISOString().slice(0, 7)}`,
            );
        }

        const rateMonth = monthlyRateRows.ratePercent; 

        const candidates: Prisma.MonthlyProfitLedgerCreateManyInput[] = [];

        let skipped = 0;
        // Prefer the active settings row; fall back to the validated env default
        // when the column is NULL (settings are optional at the contract level).
        const countingDelayDays =
            settings.countingStartAfterDays ??
            this.config.get('COUNTING_START_AFTER_DAYS', { infer: true });

        for (const inv of investments) {
            if (!inv.investmentDate) {
                skipped++;
                continue;
            }

            const invDate = toDateOnly(inv.investmentDate);

            // Counting starts countingDelayDays after the investment date.
            const countingStart = addDays(invDate, countingDelayDays);
            // console.log(countingStart, "countingStart")

            // Investment is not eligible for this cycle yet.
            if (countingStart.getTime() > cycleEnd.getTime()) {
                skipped++;
                continue;
            }

            // Determine whether this is the investment's first cycle.
            const isFirstCycle =
                countingStart.getTime() > standardCycleStart.getTime();


            // First cycle starts from countingStart.
            // Subsequent cycles start from standardCycleStart.
            const actualCycleStart = isFirstCycle
                ? countingStart
                : standardCycleStart;

            // First cycle: Count actualCycleStart through cycleEnd.
            // Subsequent cycles: Always count 30 days.
            const daysCounted = isFirstCycle
                ? toOrd(cycleEnd) - toOrd(actualCycleStart) + 1
                : 30;

            if (daysCounted <= 0) {
                skipped++;
                continue;
            }

            const ratePercent =
                inv.investmentType !== InvestmentType.fixed
                    ? rateMonth
                    : inv.rate;

            if (ratePercent === null) {
                skipped++;
                continue;
            }

            const profitAmount = computeProfit(
                inv.amount,
                ratePercent,
                daysCounted,
            );

            candidates.push({
                investmentId: inv.id,
                principalAmount: inv.amount,
                cycleStart: actualCycleStart,
                cycleEnd,
                profitAmount,
                daysCounted,
                rateApplied: ratePercent,
            });
        }

        // Create all ledger rows together. The admin notification goes in the
        let created = 0;

        if (candidates.length > 0) {
            created = await this.prisma.$transaction(async (tx) => {
                const result = await tx.monthlyProfitLedger.createMany({
                    data: candidates,
                    skipDuplicates: true,
                });

                // A run has no single row id to reference, so the notification
                // summarizes the whole batch.
                await tx.adminNotification.create({
                    data: {
                        type: 'monthly_profit_cycle' as AdminNotificationType,
                        message: `Profit accrual run completed for cycle ending ${fmt(cycleEnd)}: ${result.count} ledger entries created, ${skipped} skipped.`,
                        isRead: false,
                        clickLink: '/admin/monthly-profit-ledger',
                    },
                });

                return result.count;
            });
        }

        return this.result(
            created,
            skipped,
            cycleEnd,
        );
    }

}
