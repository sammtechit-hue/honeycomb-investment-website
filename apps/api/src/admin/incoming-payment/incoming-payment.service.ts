import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateIncomingPaymentDto } from './dto/create-incoming-payment.dto';
import { UpdateIncomingPaymentDto } from './dto/update-incoming-payment.dto';
import { IncomingPaymentQueryDto } from './dto/query-incoming-payment.dto';
import { RequestAuditContext } from '../../utils/common types';
import {
    AuditAction,
    LogModule,
    LogSeverity,
    LogStatus,
    Prisma,
} from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';

// Selected Field
const INCOMING_PAYMENT_ADMIN_SELECT = {
    id: true,
    amount: true,
    paymentMethod: true,
    screenshotUrl: true,
    senderAccountInfo: true,
    installmentNumber: true,
    dueDate: true,
    confirmedAt: true,
    status: true,

    createdAt: true,
    updatedAt: true,

    investmentId: true,
    investment: {
        select: {
            amount: true,
            status: true,
            investorId: true,
            investor: { select: { fullname: true } },
            projectId: true,
            project: { select: { name: true } },
        },
    },
} satisfies Prisma.IncomingPaymentSelect;

@Injectable()
export class IncomingPaymentService {
    constructor(private readonly prisma: PrismaService) { }

    // Example: GET /admin/incoming-payment?status=pending&page=1&limit=20&sortBy=dueDate&sortOrder=desc
    async findAllIncomingPayment(query: IncomingPaymentQueryDto) {
        const {
            page,
            limit,
            sortBy,
            sortOrder,
            investmentId,
            investorId,
            status,
            paymentMethod,
            minAmount,
            maxAmount,
            dueDateFrom,
            dueDateTo,
            search,
        } = query;

        // Only the filters the caller actually sent are applied; omitted keys are
        // skipped so an absent filter never matches on `null`.
        const where: Prisma.IncomingPaymentWhereInput = {
            ...(investmentId && { investmentId }),
            // investorId lives on the owning investment (one-to-one).
            ...(investorId && { investment: { investorId } }),
            ...(status && { status }),
            ...(paymentMethod && { paymentMethod }),
            // Payment amount range.
            ...((minAmount !== undefined || maxAmount !== undefined) && {
                amount: {
                    ...(minAmount !== undefined && { gte: minAmount }),
                    ...(maxAmount !== undefined && { lte: maxAmount }),
                },
            }),
            // Installment due-date range.
            ...((dueDateFrom !== undefined || dueDateTo !== undefined) && {
                dueDate: {
                    ...(dueDateFrom !== undefined && { gte: dueDateFrom }),
                    ...(dueDateTo !== undefined && { lte: dueDateTo }),
                },
            }),
            // Free-text search across the sender account info plus the owning
            // investor's name (reached through the one-to-one investment).
            ...(search && {
                OR: [
                    { senderAccountInfo: { contains: search, mode: 'insensitive' } },
                    {
                        investment: {
                            investor: {
                                fullname: { contains: search, mode: 'insensitive' },
                            },
                        },
                    },
                ],
            }),
        };

        // `sortBy` is a per-resource allowlist (see incomingPaymentSortByEnum);
        // the id tie-breaker keeps pagination deterministic.
        const orderBy: Prisma.IncomingPaymentOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            { id: 'asc' },
        ];

        const [payments, total] = await Promise.all([
            this.prisma.incomingPayment.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                select: INCOMING_PAYMENT_ADMIN_SELECT,
            }),
            this.prisma.incomingPayment.count({ where }),
        ]);

        return {
            message: 'Incoming payments fetched successfully',
            success: true,
            data: payments,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // For Getting One IncomingPayment's Data
    async findOneIncomingPayment(id: string) {
        const payment = await this.prisma.incomingPayment.findUnique({
            where: { id },
            select: INCOMING_PAYMENT_ADMIN_SELECT,
        });

        if (!payment) {
            throw new NotFoundException(`IncomingPayment with id ${id} not found`);
        }

        return {
            message: 'Incoming payment fetched successfully',
            success: true,
            data: payment,
        };
    }

    // For Creating IncomingPayment
    async createIncomingPayment(createIncomingPaymentDto: CreateIncomingPaymentDto) {
        return {
            message: 'IncomingPayment Created Successfully',
        };
    }


    async updateIncomingPayment(
        id: string,
        updateIncomingPaymentDto: UpdateIncomingPaymentDto,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const {
            amount,
            paymentMethod,
            screenshotUrl,
            senderAccountInfo,
            installmentNumber,
            dueDate,
            status,
        } = updateIncomingPaymentDto;

        // Prisma skips `undefined` keys, so only fields the client sent are written.
        const data: Prisma.IncomingPaymentUpdateInput = {
            ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
            ...(paymentMethod !== undefined && { paymentMethod }),
            ...(screenshotUrl !== undefined && { screenshotUrl }),
            ...(senderAccountInfo !== undefined && { senderAccountInfo }),
            ...(installmentNumber !== undefined && { installmentNumber }),
            ...(dueDate !== undefined && { dueDate }),
            ...(status !== undefined && { status }),
        };

        if (Object.values(data).every((v) => v === undefined)) {
            throw new BadRequestException('No fields provided to update');
        }

        const [existing, admin] = await Promise.all([
            this.prisma.incomingPayment.findUnique({ where: { id } }),
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : null,
        ]);

        if (!existing) {
            throw new NotFoundException(`IncomingPayment with id ${id} not found`);
        }

        if (status !== undefined && status !== existing.status) {
            // Enter block
            if (status === 'confirmed') {
                data.confirmedAt = new Date();
            } else if (existing.status === 'confirmed') {
                data.confirmedAt = null;
            }
            // End the block
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                // Optimistic lock: fails if another request changed the row since we read it.
                let updated;
                try {
                    updated = await tx.incomingPayment.update({
                        where: { id, updatedAt: existing.updatedAt },
                        data,
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                        throw new ConflictException(
                            'IncomingPayment was modified by someone else. Reload and try again.',
                        );
                    }
                    throw e;
                }

                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.incoming_payment_updated,
                        module: LogModule.PAYMENT,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `IncomingPayment Updated: ${updated.id}`,
                        targetTable: 'incoming_payments',
                        targetId: updated.id,
                        oldValue: toIncomingPaymentSnapshot(existing) as unknown as Prisma.InputJsonValue,
                        newValue: toIncomingPaymentSnapshot(updated) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });
            });

            return { message: 'IncomingPayment Updated Successfully', success: true };
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2000') {
                    throw new BadRequestException(
                        'One of the provided values is too long for its field.',
                    );
                }
                if (err.code === 'P2003') {
                    throw new BadRequestException(
                        'One or more referenced records do not exist.',
                    );
                }
            }
            throw err;
        }
    }

    // For deleting IncomingPayment
    async removeIncomingPayment(id: string) {
        return {
            message: 'IncomingPayment Deleted Successfully',
        };
    }
}

// Shape an IncomingPayment row for the audit log's oldValue / newValue JSON columns.
// Decimal -> number and Date -> ISO string keep the snapshot JSON-safe.
function toIncomingPaymentSnapshot(payment: {
    investmentId: string;
    amount: Prisma.Decimal;
    paymentMethod: string;
    screenshotUrl: string;
    senderAccountInfo: string | null;
    installmentNumber: number | null;
    dueDate: Date | null;
    confirmedAt: Date | null;
    status: string;
}) {
    return {
        investmentId: payment.investmentId,
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        screenshotUrl: payment.screenshotUrl,
        senderAccountInfo: payment.senderAccountInfo,
        installmentNumber: payment.installmentNumber,
        dueDate: payment.dueDate ? payment.dueDate.toISOString() : null,
        confirmedAt: payment.confirmedAt ? payment.confirmedAt.toISOString() : null,
        status: payment.status,
    };
}
