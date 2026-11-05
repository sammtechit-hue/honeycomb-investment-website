import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    AdminNotificationType,
    AuditAction,
    BankSelected,
    DisbursementPeriod,
    ExportFormat,
    InvestmentStatus,
    LogModule,
    LogSeverity,
    LogStatus,
    PayoutStatus,
    Prisma,
} from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import type { DisbursementItemQuery } from '@investment-platform/contracts/disbursementItem';
import { DisbursementItemQueryDto } from './dto/query-disbursement-item.dto';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { buildDisbursementItemWhere } from '../../utils/common/disbursement-itemWhereQuery.util';

// How many monthly profit-ledger rows make up one payout for each
// investment disbursement period.
const CYCLES_PER_DISBURSEMENT: Record<DisbursementPeriod, number> = {
    monthly: 1,
    quarterly: 3,
    half_yearly: 6,
    yearly: 12,
};

const MONTH_ABBREVIATIONS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

@Injectable()
export class DisbursementItemService {
    constructor(private readonly prisma: PrismaService) { }

    // sortBy → Prisma column map, type-checked against the contract's
    // disbursementItemSortBySchema so a new enum value cannot be added
    // without a matching column (same pattern as MonthlyProfitLedgerService).
    private readonly sortColumns = {
        amount: 'amount',
        exportFormat: 'exportFormat',
        createdAt: 'createdAt',
        snapshotBankName: 'snapshotBankName',
    } as const satisfies Record<
        DisbursementItemQuery['sortBy'],
        keyof Prisma.DisbursementItemOrderByWithRelationInput
    >;

    // For Getting All DisbursementItem's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/disbursement-item?search=ROI&exportFormat=cbl&page=1&limit=10
    async findAllDisbursementItem(query: DisbursementItemQueryDto) {
        const {
            search,
            batchId,
            investmentId,
            investorId,
            exportFormat,
            snapshotBankName,
            minAmount,
            maxAmount,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. Build the WHERE clause from whichever filters were provided.
        const where = buildDisbursementItemWhere({
            search,
            batchId,
            investmentId,
            investorId,
            exportFormat,
            snapshotBankName,
            minAmount,
            maxAmount,
        });

        // 2. Reuse the Order function — sortBy value plus an id asc tiebreaker
        // so pages stay deterministic.
        const orderBy =
            buildOrderBy<Prisma.DisbursementItemOrderByWithRelationInput>(
                this.sortColumns[sortBy],
                sortOrder,
            );

        // 3. Reuse the fetch function — current page and total count in parallel.
        const [items, total] = await fetchData(
            this.prisma.disbursementItem,
            where,
            orderBy,
            page,
            limit,
        );

        return {
            message: 'Disbursement items fetched successfully',
            success: true,
            data: items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // --------------------------------------------------------
    // -------------- Create Disbursement Item ----------------
    //---------------------------------------------------------
    async createDisbursementItem(
        userId?: string,
    ) {
        const investments = await this.prisma.investment.findMany({
            where: {
                status: {
                    in: [InvestmentStatus.active],
                },
                investor: {
                    bankAccount: {
                        some: {
                            isActive: true,
                        },
                    },
                },
                monthlyProfitLedger: {
                    some: {
                        payoutStatus: PayoutStatus.accrued,
                        disbursementItemId: null,
                    },
                },
            },
            select: {
                id: true,
                status: true,
                investorId: true,
                disbursementPeriod: true,
                investor: {
                    select: {
                        id: true,
                        fullname: true,
                        // Payout bank details are read from the investor.
                        bankAccount: {
                            where: { isActive: true },
                            select: {
                                selectedBank: true,
                                bankName: true,
                                accountName: true,
                                accountNumber: true,
                                routingNumber: true,
                                accountType: true,
                                branchName: true,
                            },
                        },
                    },
                },
                monthlyProfitLedger: {
                    where: {
                        payoutStatus: PayoutStatus.accrued,
                        disbursementItemId: null,
                    },
                    orderBy: { cycleStart: 'asc' },
                    select: {
                        id: true,
                        cycleStart: true,
                        cycleEnd: true,
                        profitAmount: true,
                    },
                },
            },
        });

        if (investments.length === 0) {
            throw new NotFoundException('No investment with unpaid profit found');
        }


        const created: { investmentId: string; itemId: string; ledgerRowIds: string[] }[] = [];
        const skipped: { investmentId: string; reason: string }[] = [];

        for (const inv of investments) {
            const cycles = CYCLES_PER_DISBURSEMENT[inv.disbursementPeriod];
            const rows = inv.monthlyProfitLedger;

            // Check cycles eligible
            if (rows.length < cycles) {
                skipped.push({
                    investmentId: inv.id,
                    reason: `ROI disbursement not due yet: needs ${cycles} ${cycles === 1 ? 'cycle' : 'cycles'}, has ${rows.length}`,
                });
                continue;
            }

            // example
            // cycles = 3;

            // rows = [
            //     { id: '1', profitAmount: 1000 },
            //     { id: '2', profitAmount: 1200 },
            //     { id: '3', profitAmount: 1500 },
            //     { id: '4', profitAmount: 1800 },
            // ];


            const chosenRows = rows.slice(0, 3);
            // [
            //     { id: '1', profitAmount: 1000 },
            //     { id: '2', profitAmount: 1200 },
            //     { id: '3', profitAmount: 1500 },
            // ]
            const amount = chosenRows.reduce(
                (sum, row) => sum.add(row.profitAmount), //callback function
                new Prisma.Decimal(0), // intial value
            );

            if (amount.lte(0)) {
                skipped.push({
                    investmentId: inv.id,
                    reason: `The selected profit ledger rows do not add up to a positive payout amount`,
                });
                continue;
            }

            const bankAccount = inv.investor.bankAccount[0];
            // console.log(bankAccount)

            if (!bankAccount) {
                skipped.push({
                    investmentId: inv.id,
                    reason: `The investor has no active bank account for this disbursement`,
                });
                continue;
            }

            const snapshot = {
                snapshotBankName: bankAccount.bankName,
                snapshotAccountName: bankAccount.accountName,
                snapshotAccountNumber: bankAccount.accountNumber,
                snapshotRoutingNumber: bankAccount.routingNumber,
                snapshotAccountType: bankAccount.accountType,
                snapshotBranchName: bankAccount.branchName,
            };

            const exportFormat =
                bankAccount.selectedBank === BankSelected.city_bank
                    ? ExportFormat.cbl
                    : ExportFormat.beftn;

            const reason = buildReason(
                chosenRows[0].cycleStart,
                chosenRows[cycles - 1].cycleEnd,
            );

            // এই লাইনের কাজ হলো যে MonthlyProfitLedger row-গুলো Disbursement-এর জন্য select করা হয়েছে, সেগুলোর ID আলাদা array-তে রাখা।
            const ledgerRowIds = chosenRows.map((row) => row.id);

            // createMany id return kore na (shudhu count dey)
            //  id dorkar, Ledger row link korte
            const item = await this.prisma.$transaction(async (tx) => {
                const createdItem = await tx.disbursementItem.create({
                    data: {
                        reason,
                        amount,
                        exportFormat,
                        investmentId: inv.id,
                        investorId: inv.investorId,
                        ...snapshot,
                    },
                });

                await tx.monthlyProfitLedger.updateMany({
                    where: {
                        id: { in: ledgerRowIds },
                        disbursementItemId: null,
                        payoutStatus: PayoutStatus.accrued,
                    },
                    data: { disbursementItemId: createdItem.id },
                });

                return createdItem;
            })

            created.push({
                investmentId: inv.id,
                itemId: item.id,
                ledgerRowIds
            });
        }

        // One summary notification for the whole run.
        if (created.length > 0) {
            await this.prisma.adminNotification.create({
                data: {
                    type: 'disbursement_sent' as AdminNotificationType,
                    message: `Disbursement run completed: ${created.length} item${created.length === 1 ? '' : 's'} created, ${skipped.length} skipped.`.slice(
                        0,
                        255,
                    ),
                    isRead: false,
                    clickLink: '/admin/disbursement-item',
                },
            });
        }

        return {
            message: `Disbursement Items Created Successfully: ${created.length} created, ${skipped.length} skipped`,
            success: true,
            data: { created, skipped },
        };
    }

}

function buildReason(firstCycleStart: Date, lastCycleEnd: Date): string {
    const firstYear = firstCycleStart.getUTCFullYear();
    const lastYear = lastCycleEnd.getUTCFullYear();

    const from =
        firstYear === lastYear
            ? formatDayAndMonth(firstCycleStart)
            : `${formatDayAndMonth(firstCycleStart)} ${firstYear}`;

    return `ROI Disbursement - ${from} to ${formatDayAndMonth(lastCycleEnd)} ${lastYear}`;
}

function formatDayAndMonth(date: Date): string {
    return `${date.getUTCDate()} ${MONTH_ABBREVIATIONS[date.getUTCMonth()]}`;
}


