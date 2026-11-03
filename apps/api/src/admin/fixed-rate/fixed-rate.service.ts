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
    FixedRateCreateInput,
    FixedRateUpdateInput,
} from '@investment-platform/contracts/fixed-rate';
import { FixedRateQueryDto } from './dto/query-fixed-rate.dto';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';

@Injectable()
export class FixedRateService {
    constructor(private readonly prisma: PrismaService) { }

    // --------------------------------------------------------
    // ---------------------- findAllFixedRate ----------------
    //---------------------------------------------------------
    async findAllFixedRate(query: FixedRateQueryDto) {
        const {
            search,
            isActive,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. Build the WHERE clause from whichever filters were provided.
        const where: Prisma.FixedRateWhereInput = {
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                label: { contains: search, mode: 'insensitive' },
            }),
        };

        // Reuse the Order fuction
        const orderBy = buildOrderBy<Prisma.FixedRateOrderByWithRelationInput>(sortBy, sortOrder);

        // Reuse the fetch function
        const [fixedRates, total] = await fetchData(
            this.prisma.fixedRate,
            where,
            orderBy,
            page,
            limit,
        );

        return {
            message: 'Fixed Rates fetched successfully',
            success: true,
            data: fixedRates,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ---------------------------------------------------------
    // ---------------------- findOneFixedRate ----------------
    //---------------------------------------------------------
    // GET /api/admin/fixed-rate/:id
    // async findOneFixedRate(id: number) {
    //     const fixedRate = await this.prisma.fixedRate.findUnique({
    //         where: { id },
    //     });

    //     if (!fixedRate) {
    //         throw new NotFoundException('Fixed Rate not found');
    //     }

    //     return {
    //         message: 'Fixed Rate fetched successfully',
    //         success: true,
    //         data: fixedRate,
    //     };
    // }

    // --------------------------------------------------------
    // ---------------------- CreateFixedRate -----------------
    //---------------------------------------------------------
    async createFixedRate(
        createFixedRateDto: FixedRateCreateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { rate, label } = createFixedRateDto;

        // For audit log
        const adminProfile = userId
            ? await this.prisma.adminProfile.findUnique({
                where: { userId },
                select: { id: true, name: true },
            })
            : null;

        const adminProfileId = adminProfile?.id ?? null;
        const adminName = adminProfile?.name ?? 'Admin';

        // Used For deactive other fixedRate row if have any
        const fixedRate = await this.prisma.$transaction(async (tx) => {
            const created = await tx.fixedRate.create({
                data: {
                    ...(rate !== undefined && { rate: new Prisma.Decimal(rate) }),
                    ...(label !== undefined && { label }),
                },
            });

            // other fixedRate will be false
            await tx.fixedRate.updateMany({
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
                    action: AuditAction.fixed_rate_set,
                    module: LogModule.SYSTEM,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: label
                        ? `Fixed Rate Created: ${label}`
                        : `Fixed Rate Created: ${created.id}`,
                    targetTable: 'FixedRate',
                    targetId: created.id.toString(),
                    oldValue: Prisma.DbNull,
                    newValue: toFixedRateSnapshot(created) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return created;
        });

        return {
            message: 'Fixed Rate created successfully',
            success: true,
            data: fixedRate,
        };
    }

    // ------------------------------------------------------------
    // ---------------------- updateFixedRate ---------------------
    //-------------------------------------------------------------
    // PATCH /api/admin/fixed-rate/:id
    async updateFixedRate(
        id: number,
        updateFixedRateDto: FixedRateUpdateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { rate, label, isActive } = updateFixedRateDto;

        // Admin profile (for the audit log) and the current row (404 check +
        const [adminProfile, existing] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.fixedRate.findUnique({
                where: { id },
            }),
        ]);

        if (!existing) {
            throw new NotFoundException('Fixed Rate not found');
        }

        const data: Prisma.FixedRateUpdateInput = {
            ...(rate !== undefined && { rate: new Prisma.Decimal(rate) }),
            ...(label !== undefined && { label }),
            ...(isActive !== undefined && { isActive }),
        };

        const updated = await this.prisma.$transaction(async (tx) => {
            // For updating Row
            const updatedRow = await tx.fixedRate.update({
                where: { id },
                data,
            });

            // deactivate other rows 
            if (updatedRow.isActive) {
                await tx.fixedRate.updateMany({
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
                    action: AuditAction.fixed_rate_updated,
                    module: LogModule.SYSTEM,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: labelForAudit
                        ? `Fixed Rate Updated: ${labelForAudit}`
                        : `Fixed Rate Updated: ${id}`,
                    targetTable: 'FixedRate',
                    targetId: id.toString(),
                    oldValue: toFixedRateSnapshot(existing) as unknown as Prisma.InputJsonValue,
                    newValue: toFixedRateSnapshot(updatedRow) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return updatedRow;
        });

        return {
            message: 'Fixed Rate updated successfully',
            success: true,
            data: updated,
        };
    }
}

function toFixedRateSnapshot(fixedRate: {
    rate: Prisma.Decimal | null;
    label: string | null;
    isActive: boolean;
}) {
    return {
        rate: fixedRate.rate !== null ? Number(fixedRate.rate) : null,
        label: fixedRate.label,
        isActive: fixedRate.isActive,
    };
}
