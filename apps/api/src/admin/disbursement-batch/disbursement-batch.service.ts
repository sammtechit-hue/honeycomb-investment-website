import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AuditAction, LogModule, LogSeverity, LogStatus } from '@investment-platform/db';
import { RequestAuditContext } from '../../utils/common types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildOrderBy } from '../../utils/common/build-order-by.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';
import { DisbursementBatchQueryDto } from './dto/query-disbursement-batch.dto';

@Injectable()
export class DisbursementBatchService {
    constructor(private readonly prisma: PrismaService) { }

    // --------------------------------------------------------
    // -------------- Find Disbursement Batch ----------------
    //---------------------------------------------------------
    // Example: GET /admin/disbursement-batch?search=1st&exportType=cbl&status=draft&page=1&limit=10
    async findAllDisbursementBatch(query: DisbursementBatchQueryDto) {
        const {
            search,
            exportType,
            status,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        const where: Prisma.DisbursementBatchWhereInput = {
            ...(exportType && { exportType }),
            ...(status && { status }),
            ...(search && {
                slotLabel: { contains: search, mode: 'insensitive' },
            }),
        };

        // Reuse the Order function
        const orderBy = buildOrderBy<Prisma.DisbursementBatchOrderByWithRelationInput>(
            sortBy,
            sortOrder,
        );

        // Reuse the fetch function
        const [batches, total] = await fetchData(
            this.prisma.disbursementBatch,
            where,
            orderBy,
            page,
            limit,
        );

        return {
            message: 'Disbursement batches fetched successfully',
            success: true,
            data: batches,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }


    // --------------------------------------------------------
    // -------------- Create Disbursement Batch ----------------
    //---------------------------------------------------------
    // POST /admin/disbursement-batch/:windowId
    async createDisbursementBatch(
        windowId: string,
        createDisbursementBatchDto: CreateDisbursementBatchDto,
        userId: string | undefined,
        context?: RequestAuditContext,
    ) {
        const [window, admin] = await Promise.all([
            this.prisma.payoutWindow.findUnique({
                where: { id: windowId },
                select: { startDate: true, endDate: true },
            }),
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
        ]);

        if (!window) {
            throw new NotFoundException('Payout Window not found');
        }

        if (!admin) {
            throw new NotFoundException('Admin profile not found');
        }

        const batch = await this.prisma.disbursementBatch.create({
            data: {
                slotLabel: buildSlotLabel(window.startDate, window.endDate),
                batchDate: createDisbursementBatchDto.batchDate,
                exportType: createDisbursementBatchDto.exportType,
                windowId,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                adminName: admin?.name ?? 'Admin',
                adminProfileId: admin?.id ?? null,
                action: AuditAction.disbursement_batch_created,
                module: LogModule.DISBURSEMENT,
                severity: LogSeverity.INFO,
                status: LogStatus.SUCCESS,
                targetLabel: `Disbursement Batch Created: ${batch.slotLabel}`,
                targetTable: 'disbursement_batches',
                targetId: batch.id,
                newValue: toDisbursementBatchSnapshot(batch) as unknown as Prisma.InputJsonValue,
                ipAddress: context?.ipAddress ?? null,
                userAgent: context?.userAgent ?? null,
                sessionId: context?.sessionId ?? null,
            },
        });

        return {
            message: 'Disbursement Batch Created Successfully',
            success: true,
            data: batch,
        };
    }


    // --------------------------------------------------------
    // -------------- Update Disbursement Batch ----------------
    //---------------------------------------------------------
    async update(
        id: string,
        updateDisbursementBatchDto: UpdateDisbursementBatchDto,
        userId: string | undefined,
        context?: RequestAuditContext,
    ) {
        const { slotLabel, batchDate, exportType, fileUrl, status } =
            updateDisbursementBatchDto;

        // Nothing to update
        const hasChanges = [slotLabel, batchDate, exportType, fileUrl, status].some(
            (value) => value !== undefined,
        );
        if (!hasChanges) {
            throw new BadRequestException('No fields provided to update');
        }

        const [batch, admin] = await Promise.all([
            this.prisma.disbursementBatch.findUnique({
                where: { id },
                select: {
                    id: true,
                    slotLabel: true,
                    batchDate: true,
                    exportType: true,
                    fileUrl: true,
                    status: true,
                    windowId: true,
                    createdAt: true,
                },
            }),
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
        ]);

        if (!batch) {
            throw new NotFoundException('DisbursementBatch not found');
        }

        if (!admin) {
            throw new NotFoundException('Admin profile not found');
        }

        // A confirmed batch has already been paid out, so it is immutable
        if (batch.status === 'confirmed') {
            throw new BadRequestException('A confirmed disbursement batch cannot be updated');
        }

        // A exported batch cannot go back to draft
        if (batch.status === 'exported' && status === 'draft') {
             throw new BadRequestException('A exported disbursement batch cannot be draft');
        }

        if (batch.status === 'draft' && status === 'confirmed') {
             throw new BadRequestException('A draft disbursement batch cannot be confirmed directly');
        }

        // Changing the date or export type invalidates a file that was already generated
        const exportDetailsChanged =
            (batchDate !== undefined && batchDate.toString().slice(0, 10) !== batch.batchDate.toISOString().slice(0, 10)) ||
            (exportType !== undefined && exportType !== batch.exportType);

        if (batch.status === 'exported' && exportDetailsChanged && fileUrl === undefined) {
            throw new BadRequestException(
                'Batch was already exported. Provide a new fileUrl when changing batchDate or exportType',
            );
        }

        try {
            const updated = await this.prisma.disbursementBatch.update({
                where: { id },
                data: {
                    ...(slotLabel !== undefined && { slotLabel }),
                    ...(batchDate !== undefined && { batchDate }),
                    ...(exportType !== undefined && { exportType }),
                    ...(fileUrl !== undefined && { fileUrl }),
                    ...(status !== undefined && { status }),
                },
            });

            await this.prisma.auditLog.create({
                data: {
                    adminName: admin?.name ?? 'Admin',
                    adminProfileId: admin?.id ?? null,
                    action: AuditAction.disbursement_batch_updated,
                    module: LogModule.DISBURSEMENT,
                    severity: LogSeverity.INFO,
                    status: LogStatus.SUCCESS,
                    targetLabel: `Disbursement Batch Updated: ${batch.slotLabel}`,
                    targetTable: 'disbursement_batches',
                    targetId: batch.id,
                    oldValue: toDisbursementBatchSnapshot(batch) as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });

            return {
                message: 'DisbursementBatch Updated Successfully',
                success: true,
                data: updated,
            };
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException(
                    'A disbursement batch with these details already exists',
                );
            }
            throw error;
        }
    }

    // --------------------------------------------------------
    // -------------- Remove Disbursement Batch ----------------
    //---------------------------------------------------------
    async remove(id: string, userId: string | undefined, context?: RequestAuditContext) {
        const [existing, admin] = await Promise.all([
            this.prisma.disbursementBatch.findUnique({
                where: { id },
                select: {
                    id: true,
                    slotLabel: true,
                    batchDate: true,
                    exportType: true,
                    fileUrl: true,
                    status: true,
                    windowId: true,
                    createdAt: true,
                },
            }),
            // Resolved outside the transaction to keep it (and the row lock) short.
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
        ]);

        if (!existing) {
            throw new NotFoundException(`Disbursement batch with id ${id} not found`);
        }

        if (!admin) {
            throw new NotFoundException('Admin profile not found');
        }


        if (existing.status !== 'draft') {
            throw new ConflictException(
                `A ${existing.status} disbursement batch cannot be deleted. Only draft batches can be deleted.`,
            );
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                const result = await tx.disbursementBatch.deleteMany({
                    where: { id, status: 'draft' },
                });

                if (result.count === 0) {
                    throw new ConflictException(
                        'Disbursement batch was changed. Reload and try again.',
                    );
                }

                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.disbursement_batch_deleted,
                        module: LogModule.DISBURSEMENT,
                        severity: LogSeverity.WARNING,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Disbursement Batch Deleted: ${existing.slotLabel}`,
                        targetTable: 'disbursement_batches',
                        targetId: existing.id,
                        oldValue: toDisbursementBatchSnapshot(
                            existing,
                        ) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });
            });

            return { message: 'Disbursement Batch Deleted Successfully', success: true };
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
                // A foreign key still points at this batch.
                throw new ConflictException(
                    'Disbursement batch is referenced by other records and cannot be deleted.',
                );
            }
            throw err;
        }
    }
}

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

function ordinal(day: number): string {
    const mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13) {
        return `${day}th`;
    }

    switch (day % 10) {
        case 1:
            return `${day}st`;
        case 2:
            return `${day}nd`;
        case 3:
            return `${day}rd`;
        default:
            return `${day}th`;
    }
}


function buildSlotLabel(startDate: Date, endDate: Date): string {
    const sameMonth =
        startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
        startDate.getUTCMonth() === endDate.getUTCMonth();

    const startDay = ordinal(startDate.getUTCDate());
    const endDay = ordinal(endDate.getUTCDate());
    const endMonth = MONTH_NAMES[endDate.getUTCMonth()];

    if (sameMonth) {
        return `${startDay}-${endDay} ${endMonth}`;
    }

    return `${startDay} ${MONTH_NAMES[startDate.getUTCMonth()]}-${endDay} ${endMonth}`;
}


function toDisbursementBatchSnapshot(batch: {
    id: string;
    slotLabel: string;
    batchDate: Date;
    exportType: string;
    fileUrl: string | null;
    status: string;
    windowId: string;
    createdAt: Date;
}): Record<string, string | null> {
    return {
        id: batch.id,
        slotLabel: batch.slotLabel,
        batchDate: batch.batchDate.toISOString(),
        exportType: batch.exportType,
        fileUrl: batch.fileUrl,
        status: batch.status,
        windowId: batch.windowId,
        createdAt: batch.createdAt.toISOString(),
    };
}
