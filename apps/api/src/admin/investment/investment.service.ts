import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    AuditAction,
    IncomingPaymentStatus,
    InvestmentStatus,
    LogModule,
    LogSeverity,
    LogStatus,
    Prisma,
} from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';

// Fields returned by both admin investment endpoints (list + detail). Defined
// once so the two views can never drift apart.
const INVESTMENT_ADMIN_SELECT = {
    id: true,
    investmentDate: true,
    amount: true,
    investmentType: true,
    rate: true,
    investmentPeriodMonths: true,
    disbursementPeriod: true,
    agreementPlace: true,
    agreementEndDate: true,
    status: true,
    investorId: true,
    investor: { select: { fullname: true } },
    projectId: true,
    createdAt: true,
    updatedAt: true,
    isCertificateApplicable: true,
    certificateGiven: true,
    isSouvenirApplicable: true,
    deedOffical: true,
    deedGoverment: true,
    chequeGiven: true,
    cashVoucharGiven: true,
    specialInstruction: true,
    souvenirGiven: true,
    // One-to-one relation holding the deed / cheque / voucher / certificate files.
    investmentDocuments: true,
    // One-to-one relation: at most one incoming payment per investment.
    incomingPayments: true,
} satisfies Prisma.InvestmentSelect;

// `sortBy` values that live on the related IncomingPayment rather than on
// Investment itself. Query key → actual column (`paymentStatus` is stored as
// `status`).
const PAYMENT_SORT_COLUMNS = {
    paymentMethod: 'paymentMethod',
    paymentStatus: 'status',
    paymentAmount: 'amount',
} as const satisfies Record<string, keyof Prisma.IncomingPaymentOrderByWithRelationInput>;


@Injectable()
export class InvestmentService {
    constructor(private readonly prisma: PrismaService) { }

    // For Getting All Investment's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/investment?search=&status=active&investmentType=fixed&page=1&limit=10
    async findAll(query: InvestmentQueryDto) {
        const {
            search,
            status,
            investmentType,
            disbursementPeriod,
            projectId,
            paymentMethod,
            paymentStatus,
            paymentAmount,
            investorId,
            minAmount,
            maxAmount,
            fromDate,
            toDate,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. WHERE — only the filters the caller actually sent are applied;
        //    omitted keys are skipped (no accidental `null` matches).
        const where: Prisma.InvestmentWhereInput = {
            ...(status && { status }),
            ...(investmentType && { investmentType }),
            ...(disbursementPeriod && { disbursementPeriod }),
            ...(projectId && { projectId }),
            ...(investorId && { investorId }),
            // Investment amount range.
            ...((minAmount !== undefined || maxAmount !== undefined) && {
                amount: {
                    ...(minAmount !== undefined && { gte: minAmount }),
                    ...(maxAmount !== undefined && { lte: maxAmount }),
                },
            }),
            // Investment date range (fromDate / toDate).
            ...((fromDate !== undefined || toDate !== undefined) && {
                investmentDate: {
                    ...(fromDate !== undefined && { gte: fromDate }),
                    ...(toDate !== undefined && { lte: toDate }),
                },
            }),
            // Payment filters sit on the one-to-one IncomingPayment row: keep
            // an investment when its payment matches every given condition.
            ...((paymentMethod !== undefined ||
                paymentStatus !== undefined ||
                paymentAmount !== undefined) && {
                incomingPayments: {
                    ...(paymentMethod !== undefined && { paymentMethod }),
                    // Query key is `paymentStatus`, the column is `status`.
                    ...(paymentStatus !== undefined && { status: paymentStatus }),
                    // Matches the payment when it is at least this amount.
                    ...(paymentAmount !== undefined && {
                        amount: { gte: paymentAmount },
                    }),
                },
            }),
            // Free-text search across the reference fields plus the related
            // investor / project names.
            ...(search && {
                OR: [
                    // { specialInstruction: { contains: search, mode: 'insensitive' } },
                    // { agreementPlace: { contains: search, mode: 'insensitive' } },
                    // { deedOffical: { contains: search, mode: 'insensitive' } },
                    // { deedGoverment: { contains: search, mode: 'insensitive' } },
                    // important field for search
                    { investor: { fullname: { contains: search, mode: 'insensitive' } } },
                    // { project: { name: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        };

        // Payment sorts are forwarded to the one-to-one relation; every other
        // `sortBy` value is a plain Investment column.
        let orderByField: Prisma.InvestmentOrderByWithRelationInput;
        if (
            sortBy === 'paymentMethod' ||
            sortBy === 'paymentStatus' ||
            sortBy === 'paymentAmount'
        ) {
            orderByField = {
                incomingPayments: { [PAYMENT_SORT_COLUMNS[sortBy]]: sortOrder },
            };
        } else {
            orderByField = { [sortBy]: sortOrder };
        }

        const orderBy: Prisma.InvestmentOrderByWithRelationInput[] = [
            orderByField,
            // Tie-breaker on id keeps pagination deterministic.
            { id: 'desc' as const },
        ];

        // 3. Fetch the current page and the total count in parallel.
        const [investments, total] = await Promise.all([
            this.prisma.investment.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                select: INVESTMENT_ADMIN_SELECT,
            }),
            this.prisma.investment.count({ where }),
        ]);

        return {
            message: 'Investments fetched successfully',
            success: true,
            data: investments,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // For Getting One Investment's Data
    async findOne(id: string) {
        const investment = await this.prisma.investment.findUnique({
            where: { id },
            select: INVESTMENT_ADMIN_SELECT,
        });

        if (!investment) {
            throw new NotFoundException(`Investment with id ${id} not found`);
        }

        return {
            message: 'Investment fetched successfully',
            success: true,
            data: investment,
        };
    }


    // For Creating Investment
    async create(createInvestmentDto: CreateInvestmentDto) {
        const { projectId, amount } = createInvestmentDto;

        return {
            message: 'Investment Created Successfully',
        };
    }

    // For updating Investment Information — PATCH /api/admin/investment/:id.
    async update(
        id: string,
        updateInvestmentDto: UpdateInvestmentDto,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const {
            projectId, investmentDate, amount, investmentType,
            investmentPeriodMonths, disbursementPeriod, status, rate,
            agreementEndDate, agreementPlace, deedOffical, deedGoverment,
            chequeGiven, cashVoucharGiven, souvenirGiven,
            isSouvenirApplicable, certificateGiven,
            isCertificateApplicable, specialInstruction,
        } = updateInvestmentDto;

        // Prisma skips undefined keys, so only sent fields are written.
        const data: Prisma.InvestmentUpdateInput = {
            ...(projectId !== undefined && { project: { connect: { id: projectId } } }),
            ...(investmentDate !== undefined && { investmentDate }),
            ...(amount !== undefined && { amount: new Prisma.Decimal(amount) }),
            ...(investmentType !== undefined && { investmentType }),
            ...(investmentPeriodMonths !== undefined && { investmentPeriodMonths }),
            ...(disbursementPeriod !== undefined && { disbursementPeriod }),
            ...(status !== undefined && { status }),
            ...(rate !== undefined && { rate: new Prisma.Decimal(rate) }),
            ...(agreementEndDate !== undefined && { agreementEndDate }),
            ...(agreementPlace !== undefined && { agreementPlace }),
            ...(deedOffical !== undefined && { deedOffical }),
            ...(deedGoverment !== undefined && { deedGoverment }),
            ...(chequeGiven !== undefined && { chequeGiven }),
            ...(cashVoucharGiven !== undefined && { cashVoucharGiven }),
            ...(souvenirGiven !== undefined && { souvenirGiven }),
            ...(isSouvenirApplicable !== undefined && { isSouvenirApplicable }),
            ...(certificateGiven !== undefined && { certificateGiven }),
            ...(isCertificateApplicable !== undefined && { isCertificateApplicable }),
            ...(specialInstruction !== undefined && { specialInstruction }),
        };

        if (Object.values(data).every((v) => v === undefined)) {
            throw new BadRequestException('No fields provided to update');
        }

        const [existing, admin] = await Promise.all([
            this.prisma.investment.findUnique({ where: { id } }),
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : null,
        ]);

        if (!existing) {
            throw new NotFoundException(`Investment with id ${id} not found`);
        }

        // New project must exist when retargeting. P2003 below is the backstop.
        if (projectId !== undefined && projectId !== existing.projectId) {
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true },
            });
            if (!project) {
                throw new BadRequestException('Project not found');
            }
        }

        // pending → active: নতুন amount project ও investor - এর total - এ যোগ হবে।
        // active → pending: আগের amount দুটো total থেকে বাদ যাবে।
        // active → active: amount পরিবর্তন হলে শুধু difference adjust হবে। Project পরিবর্তন হলে পুরোনো project থেকে বাদ দিয়ে নতুন project - এ যোগ হবে।
        // pending → pending: total - এ কোনো পরিবর্তন হবে না। amount difference adjust হবে না।

        const oldAmount = existing.amount as Prisma.Decimal;
        const newAmount = amount !== undefined ? new Prisma.Decimal(amount) : oldAmount;

        const oldStatus = existing.status as InvestmentStatus;
        const newStatus = (status ?? oldStatus) as InvestmentStatus;

        const wasCounted = oldStatus === InvestmentStatus.active;
        const willBeCounted = newStatus === InvestmentStatus.active;

        const amountDelta = newAmount.sub(oldAmount);
        const projectChanged = projectId !== undefined && projectId !== existing.projectId;

        // Condition for investment active status
        if (status === InvestmentStatus.active) {
            const incomingPayment = await this.prisma.incomingPayment.findUnique({
                where: { investmentId: id },
                select: { status: true },
            });

            if (
                incomingPayment == null ||
                incomingPayment.status === IncomingPaymentStatus.pending ||
                incomingPayment.status === IncomingPaymentStatus.overdue
            ) {
                throw new BadRequestException(
                    `Investment cannot be activated due to incomplete payment`,
                );
            }
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                let updated;
                try {
                    updated = await tx.investment.update({
                        where: { id, updatedAt: existing.updatedAt },
                        data,
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                        throw new ConflictException(
                            'Investment was modified by someone else. Reload and try again.',
                        );
                    }
                    throw e;
                }

                if (!wasCounted && willBeCounted) {
                    const targetProjectId = projectChanged
                        ? (projectId as string)
                        : existing.projectId;
                    await tx.project.update({
                        where: { id: targetProjectId },
                        data: { totalInvestedAmount: { increment: newAmount } },
                    });
                    await tx.investor.update({
                        where: { id: existing.investorId },
                        data: { totalInvestmentAmount: { increment: newAmount } },
                    });
                } else if (wasCounted && !willBeCounted) {
                    await tx.project.update({
                        where: { id: existing.projectId },
                        data: { totalInvestedAmount: { decrement: oldAmount } },
                    });
                    await tx.investor.update({
                        where: { id: existing.investorId },
                        data: { totalInvestmentAmount: { decrement: oldAmount } },
                    });
                } else if (wasCounted && willBeCounted) {
                    if (projectChanged) {
                        await tx.project.update({
                            where: { id: existing.projectId },
                            data: { totalInvestedAmount: { decrement: oldAmount } },
                        });
                        await tx.project.update({
                            where: { id: projectId as string },
                            data: { totalInvestedAmount: { increment: newAmount } },
                        });
                        if (!amountDelta.isZero()) {
                            await tx.investor.update({
                                where: { id: existing.investorId },
                                data: { totalInvestmentAmount: { increment: amountDelta } },
                            });
                        }
                    } else if (!amountDelta.isZero()) {
                        await tx.project.update({
                            where: { id: existing.projectId },
                            data: { totalInvestedAmount: { increment: amountDelta } },
                        });
                        await tx.investor.update({
                            where: { id: existing.investorId },
                            data: { totalInvestmentAmount: { increment: amountDelta } },
                        });
                    }
                }

                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.investment_status_changed,
                        module: LogModule.INVESTMENT,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Investment Updated: ${updated.id}`,
                        targetTable: 'investments',
                        targetId: updated.id,
                        oldValue: toInvestmentSnapshot(existing) as unknown as Prisma.InputJsonValue,
                        newValue: toInvestmentSnapshot(updated) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });
            });

            return { message: 'Investment Updated Successfully', success: true };
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2003') {
                    throw new BadRequestException(
                        'One or more referenced records do not exist.',
                    );
                }
                if (err.code === 'P2000') {
                    throw new BadRequestException(
                        'One of the provided values is too long for its field.',
                    );
                }
            }
            throw err;
        }
    }
}

// Shape an Investment row for audit oldValue / newValue JSON columns.
// Decimal -> number and Date -> ISO string keep the snapshot JSON-safe.
function toInvestmentSnapshot(investment: {
    projectId: string;
    investorId: string;
    investmentDate: Date | null;
    amount: Prisma.Decimal;
    investmentType: string;
    rate: Prisma.Decimal | null;
    investmentPeriodMonths: number | null;
    disbursementPeriod: string;
    agreementPlace: string | null;
    agreementEndDate: Date | null;
    status: string;
    deedOffical: string | null;
    deedGoverment: string | null;
    chequeGiven: boolean;
    cashVoucharGiven: boolean;
    specialInstruction: string | null;
    souvenirGiven: boolean;
    isSouvenirApplicable: boolean;
    certificateGiven: boolean;
    isCertificateApplicable: boolean;
}) {
    return {
        projectId: investment.projectId,
        investorId: investment.investorId,
        investmentDate: investment.investmentDate
            ? investment.investmentDate.toISOString()
            : null,
        amount: Number(investment.amount),
        investmentType: investment.investmentType,
        rate: investment.rate != null ? Number(investment.rate) : null,
        investmentPeriodMonths: investment.investmentPeriodMonths,
        disbursementPeriod: investment.disbursementPeriod,
        agreementPlace: investment.agreementPlace,
        agreementEndDate: investment.agreementEndDate
            ? investment.agreementEndDate.toISOString()
            : null,
        status: investment.status,
        deedOffical: investment.deedOffical,
        deedGoverment: investment.deedGoverment,
        chequeGiven: investment.chequeGiven,
        cashVoucharGiven: investment.cashVoucharGiven,
        specialInstruction: investment.specialInstruction,
        souvenirGiven: investment.souvenirGiven,
        isSouvenirApplicable: investment.isSouvenirApplicable,
        certificateGiven: investment.certificateGiven,
        isCertificateApplicable: investment.isCertificateApplicable,
    };
}
