import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@investment-platform/db';
import {
    AuditAction,
    LogModule,
    LogSeverity,
    LogStatus,
} from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import {
    ProfitLedgerSettingsCreateInput,
    ProfitLedgerSettingsUpdateInput,
} from '@investment-platform/contracts/profit-ledger-settings';
import { ProfitLedgerSettingsQueryDto } from './dto/query-profit-ledger-settings.dto';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';

@Injectable()
export class ProfitLedgerSettingsService {
    constructor(private readonly prisma: PrismaService) { }

    // --------------------------------------------------------
    // -------------- findAllProfitLedgerSettings -------------
    //---------------------------------------------------------
    async findAllProfitLedgerSettings(query: ProfitLedgerSettingsQueryDto) {
        const {
            search,
            isActive,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. Build the WHERE clause from whichever filters were provided.
        const where: Prisma.MonthlyProfitLedgerSettingsWhereInput = {
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                label: { contains: search, mode: 'insensitive' },
            }),
        };

        // Reuse the Order function
        const orderBy = buildOrderBy<Prisma.MonthlyProfitLedgerSettingsOrderByWithRelationInput>(sortBy, sortOrder);

        // Reuse the fetch function
        const [profitLedgerSettings, total] = await fetchData(
            this.prisma.monthlyProfitLedgerSettings,
            where,
            orderBy,
            page,
            limit,
        );

        return {
            message: 'Profit Ledger Settings fetched successfully',
            success: true,
            data: profitLedgerSettings,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // --------------------------------------------------------
    // -------------- CreateProfitLedgerSettings --------------
    //---------------------------------------------------------
    async createProfitLedgerSettings(
        createProfitLedgerSettingsDto: ProfitLedgerSettingsCreateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { setcycleday, label } = createProfitLedgerSettingsDto;

        // For audit log
        const adminProfile = userId
            ? await this.prisma.adminProfile.findUnique({
                where: { userId },
                select: { id: true, name: true },
            })
            : null;

        const adminProfileId = adminProfile?.id ?? null;
        const adminName = adminProfile?.name ?? 'Admin';

        // Used for deactivating other profit ledger settings rows if there are any
        const profitLedgerSettings = await this.prisma.$transaction(async (tx) => {
            const created = await tx.monthlyProfitLedgerSettings.create({
                data: {
                    setcycleday,
                    ...(label !== undefined && { label }),
                },
            });

            // other profit ledger settings rows will be false
            await tx.monthlyProfitLedgerSettings.updateMany({
                where: { isActive: true, id: { not: created.id } },
                data: { isActive: false },
            });

            // --------------------------------------------------------
            // ---------------------- AuditLog -----------------
            //---------------------------------------------------------

            await tx.auditLog.create({
                data: {
                    adminName,
                    adminProfileId,
                    action: AuditAction.profit_ledger_settings_set,
                    module: LogModule.PROFIT_LEDGER,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: label
                        ? `Profit Ledger Settings Created: ${label}`
                        : `Profit Ledger Settings Created: ${created.id}`,
                    targetTable: 'MonthlyProfitLedgerSettings',
                    targetId: created.id.toString(),
                    oldValue: Prisma.DbNull,
                    newValue: toProfitLedgerSettingsSnapshot(created) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return created;
        });

        return {
            message: 'Profit Ledger Settings created successfully',
            success: true,
            data: profitLedgerSettings,
        };
    }

    // ------------------------------------------------------------
    // -------------- UpdateProfitLedgerSettings ------------------
    //-------------------------------------------------------------
    // PATCH /api/admin/profit-ledger-settings/:id
    async updateProfitLedgerSettings(
        id: number,
        updateProfitLedgerSettingsDto: ProfitLedgerSettingsUpdateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { setcycleday, label, isActive } = updateProfitLedgerSettingsDto;

        // Admin profile (for the audit log) and the current row (404 check)
        const [adminProfile, existing] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.monthlyProfitLedgerSettings.findUnique({
                where: { id },
            }),
        ]);

        if (!existing) {
            throw new NotFoundException('Profit Ledger Settings not found');
        }

        const data: Prisma.MonthlyProfitLedgerSettingsUpdateInput = {
            ...(setcycleday !== undefined && { setcycleday }),
            ...(label !== undefined && { label }),
            ...(isActive !== undefined && { isActive }),
        };

        const updated = await this.prisma.$transaction(async (tx) => {
            // For updating Row
            const updatedRow = await tx.monthlyProfitLedgerSettings.update({
                where: { id },
                data,
            });

            // deactivate other rows
            if (updatedRow.isActive) {
                await tx.monthlyProfitLedgerSettings.updateMany({
                    where: { isActive: true, id: { not: id } },
                    data: { isActive: false },
                });
            }

            // ----------------------------------------------------------
            // ---------------------- AuditLog ---------------------------
            //------------------------------------------------------------
            const labelForAudit = label ?? existing.label;

            await tx.auditLog.create({
                data: {
                    adminName: adminProfile?.name ?? 'Admin',
                    adminProfileId: adminProfile?.id ?? null,
                    action: AuditAction.profit_ledger_settings_updated,
                    module: LogModule.PROFIT_LEDGER,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: labelForAudit
                        ? `Profit Ledger Settings Updated: ${labelForAudit}`
                        : `Profit Ledger Settings Updated: ${id}`,
                    targetTable: 'MonthlyProfitLedgerSettings',
                    targetId: id.toString(),
                    oldValue: toProfitLedgerSettingsSnapshot(existing) as unknown as Prisma.InputJsonValue,
                    newValue: toProfitLedgerSettingsSnapshot(updatedRow) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return updatedRow;
        });

        return {
            message: 'Profit Ledger Settings updated successfully',
            success: true,
            data: updated,
        };
    }
}

function toProfitLedgerSettingsSnapshot(profitLedgerSettings: {
    setcycleday: number;
    label: string | null;
    isActive: boolean;
}) {
    return {
        setcycleday: profitLedgerSettings.setcycleday,
        label: profitLedgerSettings.label,
        isActive: profitLedgerSettings.isActive,
    };
}
