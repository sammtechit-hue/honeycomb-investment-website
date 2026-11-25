
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
    MonthlyProfitLedgerQuery,
} from '@investment-platform/contracts/monthlyProfitLedger';
import { PrismaService } from '../../prisma/prisma.service';
import type { Env } from '../../config/env';

import {
    InvestmentType,
    Prisma,
    AdminNotificationType,
} from '@investment-platform/db';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { buildMonthlyProfitLedgerWhere } from '../../utils/common/monthly-profit-ledgerWhereQuery.util';
import { addDays, addMonths, fmt, getDhakaDateOnly, toDateOnly, toOrd } from '../../utils/common/bangladeshTime.util';


const ROUND_HALF_UP = 4; //তৃতীয় ঘরের সংখ্যা ৫ বা তার বেশি হলে দ্বিতীয় ঘর বাড়াবে।

// Fields returned by both admin monthly-profit-ledger endpoints (list + detail),
// so the two views can never drift apart.
const MONTHLY_PROFIT_LEDGER_ADMIN_SELECT = {
    id: true,
    cycleStart: true,
    cycleEnd: true,
    daysCounted: true,
    rateApplied: true,
    profitAmount: true,
    payoutStatus: true,
    principalAmount: true,
    investmentId: true,
    disbursementItemId: true,
    createdAt: true,
    // The investment (and its investor / project) the profit accrued on.
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
    // The disbursement item that paid this profit out, if any.
    disbursementItem: {
        select: {
            id: true,
            reason: true,
            amount: true,
            isDisbursed: true,
            batchId: true,
        },
    },
} satisfies Prisma.MonthlyProfitLedgerSelect;

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
    private readonly logger = new Logger(MonthlyProfitLedgerService.name);

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


    //-----------------------------------------------------------------
    // For Getting All MonthlyProfitLedger's Data (admin, every investor)
    //-----------------------------------------------------------------
    // Example: GET /api/admin/monthly-profit-ledger?search=&investmentId=
    //   &investorId=&payoutStatus=accrued&min=&max=&periodFrom=&periodTo=
    //   &page=1&limit=10&sortBy=periodMonth&sortOrder=desc
    async findAllMonthlyLedger(query: MonthlyProfitLedgerQuery) {
        const {
            search,
            investmentId,
            investorId,
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
            { select: MONTHLY_PROFIT_LEDGER_ADMIN_SELECT },
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

    // ------------------------------------------------------------
    // ---------------------- FindOneMonthlyLedger ----------------
    //-------------------------------------------------------------
    // GET /api/admin/monthly-profit-ledger/:id
    async findOneMonthlyLedger(id: string) {
        const ledger = await this.prisma.monthlyProfitLedger.findUnique({
            where: { id },
            select: MONTHLY_PROFIT_LEDGER_ADMIN_SELECT,
        });

        if (!ledger) {
            throw new NotFoundException(
                `Monthly profit ledger with id ${id} not found`,
            );
        }

        return {
            message: 'Monthly profit ledger fetched successfully',
            success: true,
            data: ledger,
        };
    }


    //-----------------------------------------------------------------
    // For creating All MonthlyProfitLedger's Data for every Investor
    //-----------------------------------------------------------------
    async createMonthlyLedger() {
        const today = getDhakaDateOnly();
        // const today = new Date('2026-10-11T20:30:00Z')
        // const today = new Date('2026-11-11T20:30:00Z')
        // const today = new Date('2026-12-11T20:30:00Z')
        // const today = new Date('2027-01-11T20:30:00Z')


        // Expected to run on the configured cycle day (Bangladesh date); a mismatch only logs a warning.
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

        const setcycleday = settings.setcycleday ??
            this.config.get('CYCLE_DAY', { infer: true }) ?? 11;


        if (today.getUTCDate() !== setcycleday) {
            this.logger.warn(
                `Profit cycle job should run on the ${setcycleday}th (got ${today.getUTCDate()}th) — continuing anyway`,
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
                investmentPeriodMonths: true,
                rate: true,
                projectId: true,
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

        // Rates are per project now. Load every active rate for the month in
        // one query and key it by project + month so the loop below does no
        // per-investment lookups.
        const monthlyRateRows = await this.prisma.monthlyRateSetting.findMany({
            where: {
                periodMonth: previousMonth,
                isActive: true,
            },
            select: {
                projectId: true,
                periodMonth: true,
                ratePercent: true,
            },
        });


        const rateMonthKey = previousMonth.toISOString().slice(0, 10);
        const rateMonthLabel = previousMonth.toISOString().slice(0, 7);

        const rateByProjectMonth = new Map<string, Prisma.Decimal>();
        for (const row of monthlyRateRows) {
            rateByProjectMonth.set(
                `${row.projectId}:${row.periodMonth.toISOString().slice(0, 10)}`,
                row.ratePercent,
            );
        }

        const candidates: Prisma.MonthlyProfitLedgerCreateManyInput[] = [];
        const projectsMissingRate = new Set<string>();

        let skipped = 0;
    
        const countingDelayDays =
            settings.countingStartAfterDays ??
            this.config.get('COUNTING_START_AFTER_DAYS', { infer: true }) ?? 10;


        for (const inv of investments) {
            if (!inv.investmentDate) {
                skipped++;
                continue;
            }

            // 2024-03-15T00:00:00.000Z
            const invDate = toDateOnly(inv.investmentDate);

            // Counting starts countingDelayDays after the investment date.
            const countingStart = addDays(invDate, countingDelayDays);
            // console.log(countingStart, "countingStart")

            // Investment is not eligible for this cycle yet.
            if (countingStart.getTime() > cycleEnd.getTime()) {
                skipped++;
                continue;
            }

            // default 3 month
            if (!inv.investmentPeriodMonths) {
                skipped++;
                continue;
            }


            // NEW: investment's last counting day.
            // countingStart 15 Sep + 3 months = 15 Dec, minus 1 day = 14 Dec.
            const investmentEnd = addDays(
                addMonths(countingStart, inv.investmentPeriodMonths),
                -1,
            );

            // NEW: period already finished before this cycle began.
            if (investmentEnd.getTime() < standardCycleStart.getTime()) {
                skipped++;
                continue;
            }

            // NEW: last cycle is clamped to the investment end date.
            const effectiveCycleEnd =
                investmentEnd.getTime() < cycleEnd.getTime() ? investmentEnd : cycleEnd;

            // Determine whether this is the investment's first cycle.
            const isFirstCycle =
                countingStart.getTime() > standardCycleStart.getTime();


            // First cycle starts from countingStart.
            // Subsequent cycles start from standardCycleStart.
            const actualCycleStart = isFirstCycle
                ? countingStart
                : standardCycleStart;

            // 30-day convention for every cycle (26, 30, 30, 4 ...)
            let daysCounted =
                toOrd(effectiveCycleEnd) - toOrd(actualCycleStart) + 1;
            // console.log(daysCounted);


            //  NEW: if cycle end is investment End date and daycount is less than 10, that investment will be skipped.
            if ((investmentEnd.getTime() < cycleEnd.getTime()) && (daysCounted < 10)){
                skipped++;
                continue;
            }

            if (daysCounted <= 0) {
                skipped++;
                continue;
            }

            let ratePercent = inv.rate;

            if (inv.investmentType !== InvestmentType.fixed) {
                ratePercent =
                    rateByProjectMonth.get(
                        `${inv.projectId}:${rateMonthKey}`,
                    ) ?? null;

                if (ratePercent === null) {
                    // Never accrue 0 — leave the investment out of this run
                    // and surface the missing rate to the admins below.
                    projectsMissingRate.add(inv.projectId);
                    skipped++;
                    continue;
                }
            }

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
                cycleEnd: effectiveCycleEnd,
                profitAmount,
                daysCounted,
                rateApplied: ratePercent,
            });
        }

        let missingRateProjectNames: string[] = [];

        if (projectsMissingRate.size > 0) {
            const missingProjects = await this.prisma.project.findMany({
                where: { id: { in: [...projectsMissingRate] } },
                select: { name: true },
            });

            missingRateProjectNames = missingProjects.map(
                (project) => project.name,
            );
            this.logger.warn(
                `No active monthly rate for ${rateMonthLabel} — skipped investments for project(s): ${missingRateProjectNames.join(', ') || [...projectsMissingRate].join(', ')}`,
            );
        }

        // Create all ledger rows together. Notifications go in the same
        // transaction so a run leaves either all of its bookkeeping or none.
        let created = 0;

        if (candidates.length > 0 || projectsMissingRate.size > 0) {
            created = await this.prisma.$transaction(async (tx) => {
                let count = 0;

                if (candidates.length > 0) {
                    const result = await tx.monthlyProfitLedger.createMany({
                        data: candidates,
                        skipDuplicates: true,
                    });
                    count = result.count;

                    // A run has no single row id to reference, so the
                    // notification summarizes the whole batch.
                    await tx.adminNotification.create({
                        data: {
                            type: 'monthly_profit_cycle' as AdminNotificationType,
                            message: `Profit accrual run completed for cycle ending ${fmt(cycleEnd)}: ${result.count} ledger entries created, ${skipped} skipped.`,
                            isRead: false,
                            clickLink: '/admin/monthly-profit-ledger',
                        },
                    });
                }

                if (projectsMissingRate.size > 0) {
                    const projectNames =
                        missingRateProjectNames.length > 0
                            ? missingRateProjectNames.join(', ')
                            : [...projectsMissingRate].join(', ');

                    await tx.adminNotification.create({
                        data: {
                            type: 'monthly_profit_cycle' as AdminNotificationType,
                            message: `Profit accrual run for cycle ending ${fmt(cycleEnd)} skipped investments in project(s) with no active monthly rate for ${rateMonthLabel}: ${projectNames}.`,
                            isRead: false,
                            clickLink: '/admin/monthly-rate-setting',
                        },
                    });
                }

                return count;
            });
        }

        return this.result(
            created,
            skipped,
            cycleEnd,
        );
    }

}
