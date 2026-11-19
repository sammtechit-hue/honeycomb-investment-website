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
import { fetchData } from '../../utils/common/fetchData.util';
import {
    MONTH_NAMES,
    type MonthlyRateSettingCreateInput,
    type MonthlyRateSettingQuery,
    type MonthlyRateSettingUpdateInput,
    type MonthlyRateSettingsMultipleProject,
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
        const { status, projectId, page, limit, sortBy, sortOrder } = query;

        const where: Prisma.MonthlyRateSettingWhereInput = {
            ...(status && { isActive: status === 'active' }),
            ...(projectId && { projectId }),
        };

        const orderBy: Prisma.MonthlyRateSettingOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            { id: 'asc' as const }, // deterministic pages
        ];

        const [settings, total] = await fetchData(
            this.prisma.monthlyRateSetting,
            where,
            orderBy,
            page,
            limit,
            { include: { project: { select: { id: true, name: true } } } },
        );

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
            include: { project: { select: { id: true, name: true } } },
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
        const { projectId, month, year, rate } = createMonthlyRateSettingDto;

        const periodMonth = this.toPeriodMonth(month, year);

        const [adminProfile, project, existingMonthlyRateSetting] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true, name: true },
            }),
            this.prisma.monthlyRateSetting.findUnique({
                where: { projectId_periodMonth: { projectId, periodMonth } },
            }),
        ]);

        if (!project) {
            throw new NotFoundException(`Project with id ${projectId} not found`);
        }

        if (existingMonthlyRateSetting) {
            throw new ConflictException(
                `A monthly rate setting for ${month} ${year} already exists for project ${project.name}`,
            );
        }

        try {
            const setting = await this.prisma.$transaction(async (tx) => {
                const created = await tx.monthlyRateSetting.create({
                    data: {
                        projectId,
                        periodMonth,
                        ratePercent: new Prisma.Decimal(rate),
                    },
                });

                await tx.auditLog.create({
                    data: {
                        adminName: adminProfile?.name ?? 'Admin',
                        adminProfileId: adminProfile?.id ?? null,
                        action: AuditAction.monthly_rate_set,
                        module: LogModule.PROFIT_LEDGER,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Monthly Rate Setting Created: ${month} ${year} (${project.name})`,
                        targetTable: 'monthly_rate_settings',
                        targetId: created.id,
                        metadata: {
                            projectId: project.id,
                            projectName: project.name,
                        },
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
                throw new ConflictException(
                    `A monthly rate setting for ${month} ${year} already exists for project ${project.name}`,
                );
            }
            throw error;
        }
    }

    // Applies one rate to many projects for a month. Projects that already
    // have a setting for that period are skipped (never overwritten); a single
    // batch AuditLog entry records what was created.
    async createMonthlyRateSettingsForMultipleProjects(
        createMultipleMonthlyRateSettingsDto: MonthlyRateSettingsMultipleProject,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { projectIds, month, year, rate } = createMultipleMonthlyRateSettingsDto;

        
        const uniqueProjectIds = [...new Set(projectIds)];
        const periodMonth = this.toPeriodMonth(month, year); 


        //alreadySetIds jonno existingMonthlyRateSetting newa hoice
        // project newa hoice audit log er jonno
        const [adminProfile, projects, existingMonthlyRateSetting] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.project.findMany({
                where: { id: { in: uniqueProjectIds } },
                select: { id: true, name: true },
            }),
            this.prisma.monthlyRateSetting.findMany({
                where: { projectId: { in: uniqueProjectIds }, periodMonth },
                select: { projectId: true },
            }),
        ]);

        // set niyechi karon has use korar jonno. array nile include use korte hoto
        const foundProjectIds = new Set(projects.map((project) => project.id));
        const missingProjectIds = uniqueProjectIds.filter(
            (projectId) => !foundProjectIds.has(projectId),
        );


        // missing projectId thakle error debe
        if (missingProjectIds.length > 0) {
            throw new NotFoundException(
                `Project(s) with id ${missingProjectIds.join(', ')} not found`,
            );
        }

        // 
        const alreadySetIds = new Set(existingMonthlyRateSetting.map((setting) => setting.projectId));
        const projectIdsToCreate = uniqueProjectIds.filter(
            (projectId) => !alreadySetIds.has(projectId),
        );

        if (projectIdsToCreate.length === 0) {
            return {
                message: `Monthly rate settings for ${month} ${year} already exist for all given projects`,
                success: true,
                data: [],
                meta: {
                    month,
                    year,
                    rate,
                    createdProjectIds: [],
                    skippedProjectIds: uniqueProjectIds,
                },
            };
        }

        const projectNames = new Map(projects.map((project) => [project.id, project.name]));

        const createdSettings = await this.prisma.$transaction(async (tx) => {
            // skipDuplicates absorbs a unique-key race with a concurrent request.
            const created = await tx.monthlyRateSetting.createManyAndReturn({
                data: projectIdsToCreate.map((projectId) => ({
                    projectId,
                    periodMonth,
                    ratePercent: new Prisma.Decimal(rate),
                })),
                skipDuplicates: true,
            });


            if (created.length > 0) {
                const createdProjectIds = created.map((setting) => setting.projectId);

                await tx.auditLog.create({
                    data: {
                        adminName: adminProfile?.name ?? 'Admin',
                        adminProfileId: adminProfile?.id ?? null,
                        action: AuditAction.monthly_rate_set,
                        module: LogModule.PROFIT_LEDGER,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Monthly Rate Settings Created: ${month} ${year} (${created.length} project${created.length === 1 ? '' : 's'})`,
                        targetTable: 'monthly_rate_settings',
                        targetId: periodMonthLabel(periodMonth),
                        metadata: {
                            month,
                            year,
                            rate,
                            projectIds: createdProjectIds,
                            projectNames: createdProjectIds.map(
                                (projectId) => projectNames.get(projectId) ?? null,
                            ),
                            skippedProjectIds: uniqueProjectIds.filter(
                                (projectId) => !createdProjectIds.includes(projectId),
                            ),
                        },
                        oldValue: Prisma.DbNull,
                        newValue: created.map(toMonthlyRateSettingSnapshot) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });
            }

            return created;
        });

        const createdProjectIds = createdSettings.map((setting) => setting.projectId);

        return {
            message:
                createdSettings.length > 0
                    ? 'Monthly rate settings created successfully'
                    : `Monthly rate settings for ${month} ${year} already exist for all given projects`,
            success: true,
            data: createdSettings,
            meta: {
                month,
                year,
                rate,
                createdProjectIds,
                skippedProjectIds: uniqueProjectIds.filter(
                    (projectId) => !createdProjectIds.includes(projectId),
                ),
            },
        };
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
                include: { project: { select: { id: true, name: true } } },
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
                        targetLabel: `Monthly Rate Setting Updated: ${periodMonthLabel(updated.periodMonth)} (${existing.project.name})`,
                        targetTable: 'monthly_rate_settings',
                        targetId: updated.id,
                        metadata: {
                            projectId: updated.projectId,
                            projectName: existing.project.name,
                        },
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
                throw new ConflictException(
                    'A monthly rate setting for this project and month already exists',
                );
            }
            throw error;
        }
    }
}

// "2026-09" — the period_month column is stored as the first of the month.
function periodMonthLabel(periodMonth: Date): string {
    return periodMonth.toISOString().slice(0, 7);
}

function toMonthlyRateSettingSnapshot(setting: {
    projectId: string;
    periodMonth: Date;
    ratePercent: Prisma.Decimal;
    isActive: boolean;
}) {
    return {
        projectId: setting.projectId,
        periodMonth: setting.periodMonth.toISOString(),
        ratePercent: Number(setting.ratePercent),
        isActive: setting.isActive,
    };
}
