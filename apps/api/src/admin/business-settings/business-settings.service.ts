import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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
    BusinessSettingsCreateInputSchema,
    BusinessSettingsQuery,
    BusinessSettingsUpdateInputSchema,
} from '@investment-platform/contracts/business-settings';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';

@Injectable()
export class BusinessSettingsService {
    constructor(private readonly prisma: PrismaService) { }

    // --------------------------------------------------------
    // ------------------ findAllBusinessSettings -------------
    //---------------------------------------------------------
    // GET /api/admin/business-settings
    async findAllBusinessSettings(query: BusinessSettingsQuery) {
        const {
            search,
            isActive,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. Build the WHERE clause from whichever filters were provided.
        const where: Prisma.BusinessSettingsWhereInput = {
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                label: { contains: search, mode: 'insensitive' },
            }),
        };

        // Reuse the Order function
        const orderBy = buildOrderBy<Prisma.BusinessSettingsOrderByWithRelationInput>(sortBy, sortOrder);

        // Reuse the fetch function
        const [businessSettings, total] = await fetchData(
            this.prisma.businessSettings,
            where,
            orderBy,
            page,
            limit,
        );

        return {
            message: 'Business Settings fetched successfully',
            success: true,
            data: businessSettings,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // --------------------------------------------------------
    // ------------------- findOneBusinessSettings ------------
    //---------------------------------------------------------
    // GET /api/admin/business-settings/:id
    async findOneBusinessSettings(id: number) {
        const businessSettings = await this.prisma.businessSettings.findUnique({
            where: { id },
        });

        if (!businessSettings) {
            throw new NotFoundException(`Business settings with id ${id} not found`);
        }

        return {
            message: 'Business Settings fetched successfully',
            success: true,
            data: businessSettings,
        };
    }

    // --------------------------------------------------------
    // ----------------- CreateBusinessSettings ---------------
    //---------------------------------------------------------
    // POST /api/admin/business-settings
    async createBusinessSettings(
        createBusinessSettingsDto: BusinessSettingsCreateInputSchema,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { rate, setcycleday, countingStartAfterDays, label } =
            createBusinessSettingsDto;

        // For audit log
        const adminProfile = userId
            ? await this.prisma.adminProfile.findUnique({
                where: { userId },
                select: { id: true, name: true },
            })
            : null;


        // Used for deactivating other business settings rows if there are any
        const businessSettings = await this.prisma.$transaction(async (tx) => {
            const created = await tx.businessSettings.create({
                data: {
                    ...(rate !== undefined && { rate: new Prisma.Decimal(rate) }),
                    ...(setcycleday !== undefined && { setcycleday }),
                    ...(countingStartAfterDays !== undefined && { countingStartAfterDays }),
                    ...(label !== undefined && { label }),
                },
            });

            // other business settings rows will be false
            await tx.businessSettings.updateMany({
                where: { isActive: true, id: { not: created.id } },
                data: { isActive: false },
            });

            // --------------------------------------------------------
            // ---------------------- AuditLog -----------------
            //---------------------------------------------------------

            await tx.auditLog.create({
                data: {
                    adminName: adminProfile?.name ?? 'Admin',
                    adminProfileId: adminProfile?.id ?? null,
                    action: AuditAction.business_settings_set,
                    module: LogModule.SYSTEM,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: label
                        ? `Business Settings Created: ${label}`
                        : `Business Settings Created: ${created.id}`,
                    targetTable: 'BusinessSettings',
                    targetId: created.id.toString(),
                    oldValue: Prisma.DbNull,
                    newValue: toBusinessSettingsSnapshot(created) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return created;
        });

        return {
            message: 'Business Settings created successfully',
            success: true,
            data: businessSettings,
        };
    }

    // --------------------------------------------------------
    // ----------------- UpdateBusinessSettings ---------------
    //---------------------------------------------------------
    // PATCH /api/admin/business-settings/:id
    async updateBusinessSettings(
        id: number,
        updateBusinessSettingsDto: BusinessSettingsUpdateInputSchema,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const { rate, setcycleday, countingStartAfterDays, label, isActive } =
            updateBusinessSettingsDto;

        // For audit log
        const [adminProfile, existingBusinessSettings] = await Promise.all([
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            this.prisma.businessSettings.findUnique({
                where: { id },
            }),
        ]);

        if (!adminProfile){
            throw new NotFoundException(`adminProfile not found`);
        }

        if (!existingBusinessSettings) {
            throw new NotFoundException(`Business settings with id ${id} not found`);
        }

        if (
            [rate, setcycleday, countingStartAfterDays, label, isActive].every(
                (value) => value === undefined,
            )
        ) {
            throw new BadRequestException(
                'At least one field must be provided',
            );
        }

        const data: Prisma.BusinessSettingsUpdateInput = {
            ...(rate !== undefined && { rate: new Prisma.Decimal(rate) }),
            ...(setcycleday !== undefined && { setcycleday }),
            ...(countingStartAfterDays !== undefined && { countingStartAfterDays }),
            ...(label !== undefined && { label }),
            ...(isActive !== undefined && { isActive }),
        };

        const businessSettings = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.businessSettings.update({
                where: { id },
                data,
            });

            // Activating a row deactivates every other business settings row
            if (isActive === true) {
                await tx.businessSettings.updateMany({
                    where: { isActive: true, id: { not: updated.id } },
                    data: { isActive: false },
                });
            }

            // --------------------------------------------------------
            // ---------------------- AuditLog -----------------
            //---------------------------------------------------------

            await tx.auditLog.create({
                data: {
                    adminName: adminProfile?.name ?? 'Admin',
                    adminProfileId: adminProfile?.id ?? null,
                    action: AuditAction.business_settings_updated,
                    module: LogModule.SYSTEM,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: label
                        ? `Business Settings Updated: ${label}`
                        : `Business Settings Updated: ${updated.id}`,
                    targetTable: 'BusinessSettings',
                    targetId: updated.id.toString(),
                    oldValue: toBusinessSettingsSnapshot(existingBusinessSettings) as unknown as Prisma.InputJsonValue,
                    newValue: toBusinessSettingsSnapshot(updated) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return updated;
        });

        return {
            message: 'Business Settings updated successfully',
            success: true,
            data: businessSettings,
        };
    }
}

function toBusinessSettingsSnapshot(businessSettings: {
    rate: Prisma.Decimal | null;
    setcycleday: number | null;
    countingStartAfterDays: number | null;
    label: string | null;
    isActive: boolean;
}) {
    return {
        rate: businessSettings.rate !== null ? Number(businessSettings.rate) : null,
        setcycleday: businessSettings.setcycleday,
        countingStartAfterDays: businessSettings.countingStartAfterDays,
        label: businessSettings.label,
        isActive: businessSettings.isActive,
    };
}
