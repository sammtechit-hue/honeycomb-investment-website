import {
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
import { DisbursementItemQueryDto } from './dto/query-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';

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

    // --------------------------------------------------------
    // -------------- FindAll Disbursement Item ----------------
    //---------------------------------------------------------
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
        const where: Prisma.DisbursementItemWhereInput = {
            ...(batchId && { batchId }),
            ...(investmentId && { investmentId }),
            ...(investorId && { investorId }),
            ...(exportFormat && { exportFormat }),
            ...(snapshotBankName && {
                snapshotBankName: { contains: snapshotBankName, mode: 'insensitive' },
            }),
            ...((minAmount !== undefined || maxAmount !== undefined) && {
                amount: {
                    ...(minAmount !== undefined && { gte: minAmount }),
                    ...(maxAmount !== undefined && { lte: maxAmount }),
                },
            }),
            ...(search && {
                OR: [
                    { reason: { contains: search, mode: 'insensitive' } },
                    { snapshotBankName: { contains: search, mode: 'insensitive' } },
                    { snapshotAccountName: { contains: search, mode: 'insensitive' } },
                    { snapshotAccountNumber: { contains: search, mode: 'insensitive' } },
                    // fullname is on the Investor row itself; email/phone on the User.
                    { investor: { fullname: { contains: search, mode: 'insensitive' } } },
                    { investor: { user: { email: { contains: search, mode: 'insensitive' } } } },
                    { investor: { user: { phone: { contains: search, mode: 'insensitive' } } } },
                ],
            }),
        };

        // Every sortBy value is a direct column, so no mapping is needed.
        const orderBy: Prisma.DisbursementItemOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            // Tie-breaker on id keeps pagination deterministic.
            { id: 'asc' as const },
        ];

        // Current page and total count fetched in parallel.
        const [items, total] = await Promise.all([
            this.prisma.disbursementItem.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    investor: {
                        select: {
                            fullname: true,
                            status: true,
                            user: { select: { email: true, phone: true } },
                        },
                    },
                    investment: { select: { amount: true, status: true } },
                    batch: {
                        select: { slotLabel: true, batchDate: true, status: true },
                    },
                },
            }),
            this.prisma.disbursementItem.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            message: 'Disbursement items fetched successfully',
            success: true,
            data: items,
            meta: {
                page,
                limit,
                total,
                totalPages,
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

    // --------------------------------------------------------
    // -------------- Update Disbursement Item Remark ----------
    //---------------------------------------------------------
    async updateDisbursementItem(
        id: string,
        dto: UpdateDisbursementItemDto,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const [existingItem, admin] = await Promise.all([
            this.prisma.disbursementItem.findUnique({
                where: { id },
                select: { id: true, remarks: true, investorNote: true },
            }),
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
        ]);

        if (!existingItem) {
            throw new NotFoundException(`Disbursement item with id ${id} not found`);
        }

        // Empty string / null clears each note; both are nullable per the schema.
        const remarks = dto.remarks?.trim() || null;
        const investorNote = dto.investorNote?.trim() || null;

        const updated = await this.prisma.$transaction(async (tx) => {
            const updatedItem = await tx.disbursementItem.update({
                where: { id },
                data: { remarks, investorNote },
            });

            await tx.auditLog.create({
                data: {
                    adminName: admin?.name ?? 'Admin',
                    adminProfileId: admin?.id ?? null,
                    action: AuditAction.disbursement_item_remark_updated,
                    module: LogModule.DISBURSEMENT,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: `Disbursement Item Remark Updated: ${updatedItem.id}`,
                    targetTable: 'disbursement_items',
                    targetId: updatedItem.id,
                    oldValue: {
                        remarks: existingItem.remarks,
                        investorNote: existingItem.investorNote,
                    } as unknown as Prisma.InputJsonValue,
                    newValue: {
                        remarks: updatedItem.remarks,
                        investorNote: updatedItem.investorNote,
                    } as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return updatedItem;
        });

        return {
            message: 'Disbursement Item Remark Updated Successfully',
            success: true,
            data: updated,
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


