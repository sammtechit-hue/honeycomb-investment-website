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

@Injectable()
export class IncomingPaymentService {
    constructor(private readonly prisma: PrismaService) { }

    // For Getting All IncomingPayment's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/incoming-payment?status=pending&page=1&limit=20&sortBy=dueDate&sortOrder=desc
    async findAll(query: IncomingPaymentQueryDto) {
        return {
            message: "HelloWorld Return all IncomingPayment's data",
        };
    }

    // For Getting One IncomingPayment's Data
    async findOne(id: string) {
        return id + 'This route is for IncomingPayment who will see their necessary data and partially modify data';
    }

    // For Creating IncomingPayment
    async create(createIncomingPaymentDto: CreateIncomingPaymentDto) {
        return {
            message: 'IncomingPayment Created Successfully',
        };
    }


    async update(
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
    async remove(id: string) {
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
