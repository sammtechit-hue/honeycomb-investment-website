import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
    AuditAction,
    LogModule,
    LogSeverity,
    LogStatus,
    Prisma,
} from '@investment-platform/db';
import { PayoutWindowCreateInput } from '@investment-platform/contracts/payoutWindow';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { PayoutWindowQueryDto } from './dto/query-payout-window.dto';

@Injectable()
export class PayoutWindowService {
    constructor(private readonly prisma: PrismaService) { }

    // --------------------------------------------------------
    // ------------------- findAllPayoutWindow ----------------
    //----------------------------------------------------------
    // GET /api/admin/payout-window?status=open&periodFrom=2026-01-01&periodTo=2026-01-31&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    async findAllPayoutWindow(query: PayoutWindowQueryDto) {
        const {
            status,
            periodFrom,
            periodTo,
            startDateFrom,
            startDateTo,
            endDateFrom,
            endDateTo,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. Build the WHERE clause from whichever filters were provided.
        const where: Prisma.PayoutWindowWhereInput = {
            ...(status !== undefined && { status }),
            ...((periodFrom || periodTo) && {
                periodMonth: {
                    ...(periodFrom && { gte: periodFrom }),
                    ...(periodTo && { lte: periodTo }),
                },
            }),
            ...((startDateFrom || startDateTo) && {
                startDate: {
                    ...(startDateFrom && { gte: startDateFrom }),
                    ...(startDateTo && { lte: startDateTo }),
                },
            }),
            ...((endDateFrom || endDateTo) && {
                endDate: {
                    ...(endDateFrom && { gte: endDateFrom }),
                    ...(endDateTo && { lte: endDateTo }),
                },
            }),
        };

        // Reuse the Order function
        const orderBy = buildOrderBy<Prisma.PayoutWindowOrderByWithRelationInput>(
            sortBy,
            sortOrder,
        );

        // Reuse the fetch function
        const [payoutWindows, total] = await fetchData(
            this.prisma.payoutWindow,
            where,
            orderBy,
            page,
            limit,
        );

        return {
            message: 'Payout Windows fetched successfully',
            success: true,
            data: payoutWindows,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // --------------------------------------------------------
    // ------------------- createPayoutWindow ----------------
    //----------------------------------------------------------
    // POST /api/admin/payout-window
    async createPayoutWindow(
        createPayoutWindowDto: PayoutWindowCreateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { periodMonth, startDate, endDate } = createPayoutWindowDto;

        // For audit log
        const adminProfile = userId
            ? await this.prisma.adminProfile.findUnique({
                where: { userId },
                select: { id: true, name: true },
            })
            : null;

        const payoutWindow = await this.prisma.$transaction(async (tx) => {
            const created = await tx.payoutWindow.create({
                data: { periodMonth, startDate, endDate },
            });

            // --------------------------------------------------------
            // ---------------------- AuditLog -------------------------
            //-----------------------------------------------------------
            await tx.auditLog.create({
                data: {
                    adminName: adminProfile?.name ?? 'Admin',
                    adminProfileId: adminProfile?.id ?? null,
                    action: AuditAction.payout_window_created,
                    module: LogModule.DISBURSEMENT,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: `Payout Window Created: ${toDateOnly(created.periodMonth)}`,
                    targetTable: 'PayoutWindow',
                    targetId: created.id,
                    oldValue: Prisma.DbNull,
                    newValue: toPayoutWindowSnapshot(created) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return created;
        });

        return {
            message: 'Payout Window created successfully',
            success: true,
            data: payoutWindow,
        };
    }

    // --------------------------------------------------------
    // ---------------------- updatePayoutWindow -------------
    //------------------------------------------------------------
    // PATCH /api/admin/payout-window/:id
    async updatePayoutWindow(
        id: string,
        updatePayoutWindowDto: import('@investment-platform/contracts/payoutWindow').PayoutWindowUpdateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { periodMonth, startDate, endDate } = updatePayoutWindowDto;

        // Admin profile (for the audit log) and the current row (404 check)
        const [adminProfile, existing] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.payoutWindow.findUnique({
                where: { id },
            }),
        ]);

        if (!existing) {
            throw new NotFoundException('Payout Window not found');
        }

        const data: Prisma.PayoutWindowUpdateInput = {
            ...(periodMonth !== undefined && { periodMonth }),
            ...(startDate !== undefined && { startDate }),
            ...(endDate !== undefined && { endDate }),
        };

        if (Object.values(data).every((v) => v === undefined)) {
            throw new BadRequestException('No fields provided to update');
        }

        // Effective range after the update (new value if given, else existing)
        const effectiveStart = startDate !== undefined ? new Date(startDate) : existing.startDate;
        const effectiveEnd = endDate !== undefined ? new Date(endDate) : existing.endDate;

        const datesChanged = startDate !== undefined || endDate !== undefined;

        if (datesChanged && effectiveStart >= effectiveEnd) {
            throw new BadRequestException('Start date must be before end date');
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            // For updating Row
            const updatedRow = await tx.payoutWindow.update({
                where: { id },
                data,
            });

            // --------------------------------------------------------
            // ---------------------- AuditLog -------------------------
            //-----------------------------------------------------------
            await tx.auditLog.create({
                data: {
                    adminName: adminProfile?.name ?? 'Admin',
                    adminProfileId: adminProfile?.id ?? null,
                    action: AuditAction.payout_window_updated,
                    module: LogModule.DISBURSEMENT,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: `Payout Window Updated: ${toDateOnly(updatedRow.periodMonth)}`,
                    targetTable: 'PayoutWindow',
                    targetId: id,
                    oldValue: toPayoutWindowSnapshot(existing) as unknown as Prisma.InputJsonValue,
                    newValue: toPayoutWindowSnapshot(updatedRow) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return updatedRow;
        });

        return {
            message: 'Payout Window updated successfully',
            success: true,
            data: updated,
        };
    }
}

function toPayoutWindowSnapshot(payoutWindow: {
    periodMonth: Date;
    startDate: Date;
    endDate: Date;
    status: string;
    completedAt: Date | null;
}) {
    return {
        periodMonth: toDateOnly(payoutWindow.periodMonth),
        startDate: toDateOnly(payoutWindow.startDate),
        endDate: toDateOnly(payoutWindow.endDate),
        status: payoutWindow.status,
        completedAt: payoutWindow.completedAt
            ? payoutWindow.completedAt.toISOString()
            : null,
    };
}

// @db.Date columns — serialize as YYYY-MM-DD so the audit snapshot stays stable.
function toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
}