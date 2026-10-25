import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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
    MONTH_NAMES,
    type MonthlyRateSettingCreateInput,
    type MonthlyRateSettingQuery,
    type MonthlyRateSettingUpdateInput,
} from '@investment-platform/contracts/monthlyRateSetting';

// Month name (lowercase, per monthNameSchema) → month index for Date.UTC.
const MONTH_NAME_TO_INDEX: Record<(typeof MONTH_NAMES)[number], number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
};

@Injectable()
export class MonthlyRateSettingService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    private toPeriodMonth(month: (typeof MONTH_NAMES)[number], year: number): Date {
        return new Date(Date.UTC(year, MONTH_NAME_TO_INDEX[month], 1));
    }

    async findAll(query: MonthlyRateSettingQuery) {
        const { status, page, limit, sortBy, sortOrder } = query;

        const where: Prisma.MonthlyRateSettingWhereInput = {
            ...(status && { isActive: status === 'active' }),
        };

        const orderBy: Prisma.MonthlyRateSettingOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            { id: 'asc' as const }, // deterministic pages
        ];

        const [settings, total] = await Promise.all([
            this.prisma.monthlyRateSetting.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.monthlyRateSetting.count({ where }),
        ]);

        return {
            message: 'Monthly rate settings fetched successfully',
            success: true,
            data: settings,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // For Getting One Monthly Rate Setting
    async findOne(id: string) {
        const setting = await this.prisma.monthlyRateSetting.findUnique({
            where: { id },
        });

        if (!setting) {
            throw new NotFoundException(`Monthly rate setting with id ${id} not found`);
        }

        return {
            message: 'Monthly rate setting fetched successfully',
            success: true,
            data: setting,
        };
    }

    async createMonthlyRateSetting(
        createMonthlyRateSettingDto: MonthlyRateSettingCreateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { month, year, rate } = createMonthlyRateSettingDto;

        const periodMonth = this.toPeriodMonth(month, year);

        const [adminProfile, existing] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.monthlyRateSetting.findUnique({
                where: { periodMonth },
            }),
        ]);

        if (existing) {
            throw new ConflictException(`A monthly rate setting for ${month} ${year} already exists`);
        }

        const adminProfileId = adminProfile?.id ?? null; // profile missing / no JWT user
        const adminName = adminProfile?.name ?? 'Admin'; // name is optional in schema

        try {
            const setting = await this.prisma.$transaction(async (tx) => {
                const created = await tx.monthlyRateSetting.create({
                    data: {
                        periodMonth,
                        ratePercent: new Prisma.Decimal(rate),
                    },
                });

                await tx.auditLog.create({
                    data: {
                        adminName,
                        adminProfileId,
                        action: AuditAction.monthly_rate_set,
                        module: LogModule.PROFIT_LEDGER,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Monthly Rate Setting Created: ${month} ${year}`,
                        targetTable: 'monthly_rate_settings',
                        targetId: created.id,
                        oldValue: Prisma.DbNull,
                        newValue: toMonthlyRateSettingSnapshot(created) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });

                return created;
            });

            return {
                message: 'Monthly Rate Setting Created successfully',
                success: true,
                data: setting,
            };
        } catch (error) {
            // Unique-key race between the check above and the insert.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException(`A monthly rate setting for ${month} ${year} already exists`);
            }
            throw error;
        }
    }

    async updateMonthlyRateSetting(
        id: string,
        updateMonthlyRateSettingDto: MonthlyRateSettingUpdateInput,
        userId?: string,
        context?: RequestAuditContext,
    ) {

        const [adminProfile, existing] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.monthlyRateSetting.findUnique({
                where: { id },
            }),
        ]);

        if (!existing) {
            throw new NotFoundException(`Monthly rate setting with id ${id} not found`);
        }

        const adminProfileId = adminProfile?.id ?? null;
        const adminName = adminProfile?.name ?? 'Admin';

        const data: Prisma.MonthlyRateSettingUpdateInput = {
            ...(updateMonthlyRateSettingDto.rate !== undefined && {
                ratePercent: new Prisma.Decimal(updateMonthlyRateSettingDto.rate),
            }),
            ...(updateMonthlyRateSettingDto.isActive !== undefined && {
                isActive: updateMonthlyRateSettingDto.isActive,
            }),
        };

        if (
            [updateMonthlyRateSettingDto.rate, updateMonthlyRateSettingDto.isActive]
                .every((value) => value === undefined)
        ) {
            throw new BadRequestException(
                'At least one field must be provided',
            );
        }

        try {
            const setting = await this.prisma.$transaction(async (tx) => {
                const updated = await tx.monthlyRateSetting.update({
                    where: { id },
                    data,
                });

                await tx.auditLog.create({
                    data: {
                        adminName,
                        adminProfileId,
                        action: AuditAction.monthly_rate_updated,
                        module: LogModule.PROFIT_LEDGER,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Monthly Rate Setting Updated: ${updated.id}`,
                        targetTable: 'monthly_rate_settings',
                        targetId: updated.id,
                        oldValue: toMonthlyRateSettingSnapshot(existing) as unknown as Prisma.InputJsonValue,
                        newValue: toMonthlyRateSettingSnapshot(updated) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });

                return updated;
            });

            return {
                message: 'Monthly Rate Setting updated successfully',
                success: true,
                data: setting,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('A monthly rate setting for this month already exists');
            }
            throw error;
        }
    }
}

function toMonthlyRateSettingSnapshot(setting: {
    periodMonth: Date;
    ratePercent: Prisma.Decimal;
    isActive: boolean;
}) {
    return {
        periodMonth: setting.periodMonth.toISOString(),
        ratePercent: Number(setting.ratePercent),
        isActive: setting.isActive,
    };
}
