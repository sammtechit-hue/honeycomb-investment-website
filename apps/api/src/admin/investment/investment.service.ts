import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import {
    AuditAction,
    IncomingPaymentStatus,
    InvestmentStatus,
    InvestmentType,
    InvestorStatus,
    LogModule,
    LogSeverity,
    LogStatus,
    Prisma,
} from '@investment-platform/db';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { Env } from '../../config/env';
import { RequestAuditContext } from '../../utils/common types';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';
import { investmentPeriodDisbursementError } from '@investment-platform/contracts/investment';
import { getDhakaDateOnly } from '../../utils/common/bangladeshTime.util';
import { fetchData } from '../../utils/common/fetchData.util';
import { assertProjectAcceptsInvestment } from '../../utils/common/project-investment.util';
import {
    type BulkInvestmentCreateRequest,
    type BulkInvestmentRowInput,
    type BulkInvestmentRowIssue,
    type BulkInvestmentRowResult,
} from '@investment-platform/contracts/investment-bulk-create';

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
    project: { select: { name: true } },
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

// Project fields needed to validate a bulk row: eligibility plus the project
// rate used for fixed investments.
const INVESTMENT_BULK_PROJECT_SELECT = {
    id: true,
    name: true,
    status: true,
    isActive: true,
    isVisible: true,
    startDate: true,
    endDate: true,
    minimumInvestment: true,
    maximumInvestment: true,
    projectRate: true,
} satisfies Prisma.ProjectSelect;

// `sortBy` values that live on the related IncomingPayment rather than on
// Investment itself. Query key → actual column (`paymentStatus` is stored as
// `status`).
const PAYMENT_SORT_COLUMNS = {
    paymentMethod: 'paymentMethod',
    paymentStatus: 'status',
    paymentAmount: 'amount',
} as const satisfies Record<string, keyof Prisma.IncomingPaymentOrderByWithRelationInput>;


const LIFETIME_STATUSES: ReadonlySet<InvestmentStatus> = new Set([
    InvestmentStatus.active,
    InvestmentStatus.closed,
]);


const ALLOWED_STATUS_TRANSITIONS: Record<
    InvestmentStatus,
    readonly InvestmentStatus[]
> = {
    [InvestmentStatus.pending]: [
        InvestmentStatus.pending,
        InvestmentStatus.active,
        InvestmentStatus.rejected,
    ],
    [InvestmentStatus.active]: [
        InvestmentStatus.active,
        InvestmentStatus.closed,
    ],
    [InvestmentStatus.rejected]: [
        InvestmentStatus.rejected,
        InvestmentStatus.active,
    ],
    [InvestmentStatus.closed]: [InvestmentStatus.closed],
};


function contributionOf(status: InvestmentStatus, amount: Prisma.Decimal) {
    return {
        total: LIFETIME_STATUSES.has(status) ? amount : new Prisma.Decimal(0),
        active:
            status === InvestmentStatus.active
                ? amount
                : new Prisma.Decimal(0),
    };
}

// Human-readable reason for a forbidden transition (cases 3 and 5).
function statusTransitionError(
    from: InvestmentStatus,
    to: InvestmentStatus,
): string {
    if (from === InvestmentStatus.active) {
        return 'An active investment can only be moved to closed';
    }
    if (from === InvestmentStatus.closed) {
        return 'A closed investment is final; its status cannot be changed';
    }
    if (from === InvestmentStatus.pending && to === InvestmentStatus.closed) {
        return 'A pending investment cannot be closed; activate or reject it first';
    }
    return `Investment status cannot be changed from ${from} to ${to}`;
}


@Injectable()
export class InvestmentService {
    private readonly logger = new Logger(InvestmentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService<Env, true>,
    ) { }

    // ----------------------------------------------------------
    // -------------------------- findAll -----------------------
    // ----------------------------------------------------------
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

        // 3. Reuse the fetch function — current page and total count in parallel.
        const [investments, total] = await fetchData(
            this.prisma.investment,
            where,
            orderBy,
            page,
            limit,
            { select: INVESTMENT_ADMIN_SELECT },
        );

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

    // ----------------------------------------------------------
    // -------------------------- findOne -----------------------
    // ----------------------------------------------------------
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


    // ----------------------------------------------------------
    // --------------------- createInvestment -------------------
    // ----------------------------------------------------------
    // For Creating Investment (admin, on behalf of an investor)
    async createInvestment(
        createInvestmentDto: CreateInvestmentDto,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const {
            investorId, projectId, amount, investmentType,
            investmentPeriodMonths, disbursementPeriod,
            investmentDate, agreementEndDate, agreementPlace,
            deedOffical, deedGoverment, chequeGiven, cashVoucharGiven,
            souvenirGiven, isSouvenirApplicable, certificateGiven,
            isCertificateApplicable, specialInstruction, status
        } = createInvestmentDto;

        // Cross-field contract rule, re-checked here so every caller of this
        // service (not just the DTO-validated HTTP path) is covered.
        const periodError = investmentPeriodDisbursementError({
            investmentPeriodMonths,
            disbursementPeriod,
        });
        if (periodError) {
            throw new BadRequestException(periodError);
        }

        const [investor, project] = await Promise.all([
            this.prisma.investor.findUnique({
                where: { id: investorId },
                select: { id: true, fullname: true },
            }),
            this.prisma.project.findUnique({
                where: { id: projectId },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    isActive: true,
                    isVisible: true,
                    startDate: true,
                    endDate: true,
                    minimumInvestment: true,
                    maximumInvestment: true,
                    projectRate: true,
                },
            }),
        ]);

        if (!investor) {
            throw new NotFoundException(`Investor with id ${investorId} not found`);
        }
        if (!project) {
            throw new NotFoundException(`Project with id ${projectId} not found`);
        }

        assertProjectAcceptsInvestment(project, new Prisma.Decimal(amount));


        let rate: Prisma.Decimal | undefined;

        if (investmentType === InvestmentType.fixed) {
            if (project.projectRate != null) {
                rate = project.projectRate;
            } else {
                const settings = await this.prisma.businessSettings.findFirst({
                    where: { isActive: true },
                    select: { rate: true },
                });

                rate =
                    settings?.rate ??
                    new Prisma.Decimal(this.config.get('FIXED_RATE', { infer: true }));
            }
        }
        // else {
        //     const investmentMonth = investmentDate ?? getDhakaDateOnly();
        //     const periodMonth = new Date(
        //         Date.UTC(
        //             investmentMonth.getUTCFullYear(),
        //             investmentMonth.getUTCMonth(),
        //             1,
        //         ),
        //     );

        //     const monthlyRate = await this.prisma.monthlyRateSetting.findUnique({
        //         where: { projectId_periodMonth: { projectId, periodMonth } },
        //         select: { ratePercent: true, isActive: true },
        //     });

        //     // Never create an unfixed investment that can't accrue profit.
        //     if (!monthlyRate || !monthlyRate.isActive) {
        //         throw new BadRequestException(
        //             `No active monthly rate setting found for project ${project.name} for ${periodMonth.toISOString().slice(0, 7)}`,
        //         );
        //     }

        //     rate = monthlyRate.ratePercent;
        // }

        const data: Prisma.InvestmentCreateInput = {
            amount: new Prisma.Decimal(amount),
            investmentType,
            investmentPeriodMonths,
            disbursementPeriod,
            ...(rate !== undefined && { rate: new Prisma.Decimal(rate) }),
            // Later slot math needs a date even if the admin omits one.
            investmentDate: investmentDate ?? getDhakaDateOnly(),
            ...(agreementEndDate !== undefined && { agreementEndDate }),
            ...(agreementPlace !== undefined && { agreementPlace }),
            ...(deedOffical !== undefined && { deedOffical }),
            ...(deedGoverment !== undefined && { deedGoverment }),
            ...(chequeGiven !== undefined && { chequeGiven }),
            ...(cashVoucharGiven !== undefined && { cashVoucharGiven }),
            ...(souvenirGiven !== undefined && { souvenirGiven }),
            ...(isSouvenirApplicable !== undefined && { isSouvenirApplicable }),
            ...(certificateGiven !== undefined && { certificateGiven }),
            ...(status !== undefined && { status }),
            ...(isCertificateApplicable !== undefined && { isCertificateApplicable }),
            ...(specialInstruction !== undefined && { specialInstruction }),
            // A new row always starts pending; status changes go through the
            // audited update flow, which enforces the payment/investor rules.
            ...(status !== undefined && { status }),
            investor: { connect: { id: investorId } },
            project: { connect: { id: projectId } },
        };

        try {
            const created = await this.prisma.$transaction(async (tx) => {
                const investment = await tx.investment.create({
                    data,
                    select: INVESTMENT_ADMIN_SELECT,
                });

                const admin = userId
                    ? await tx.adminProfile.findUnique({
                        where: { userId },
                        select: { id: true, name: true },
                    })
                    : null;

                // ----------------------------------------------------------
                // ------------------------- AUDITLOG -----------------------
                // ----------------------------------------------------------
                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.investment_created,
                        module: LogModule.INVESTMENT,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Investment Created: ${investor.fullname}`,
                        targetTable: 'investments',
                        targetId: investment.id,
                        oldValue: Prisma.DbNull,
                        newValue: toInvestmentSnapshot(investment) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });

                return investment;
            });

            return {
                message: 'Investment Created Successfully',
                success: true,
                data: created,
            };
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

    // ----------------------------------------------------------
    // -------------------- createBulkInvestment ----------------
    // ----------------------------------------------------------
    async createBulkInvestment(

        createBulkInvestmentDto: BulkInvestmentCreateRequest,
        userId: string | undefined,
        context?: RequestAuditContext,
    ) {
        if (!userId) {
            throw new UnauthorizedException('Session is no longer valid');
        }

        const { rows } = createBulkInvestmentDto;


        const investorIds = rows.map((row) => row.investorId);
        const projectIds = rows.map((row) => row.projectId);

        const [admin, investors, projects, settings] = await Promise.all([
            this.prisma.adminProfile.findUnique({
                where: { userId },
                select: { id: true, name: true },
            }),
            this.prisma.investor.findMany({
                where: { id: { in: investorIds } },
                select: { id: true, fullname: true },
            }),
            this.prisma.project.findMany({
                where: { id: { in: projectIds } },
                select: INVESTMENT_BULK_PROJECT_SELECT,
            }),
            // Same fixed-rate fallback as createInvestment.
            this.prisma.businessSettings.findFirst({
                where: { isActive: true },
                select: { rate: true },
            }),
        ]);

        const investorById = new Map(
            investors.map((investor) => [investor.id, investor]),
        );
        const projectById = new Map(
            projects.map((project) => [project.id, project]),
        );

        const fallbackRate =
            settings?.rate ??
            new Prisma.Decimal(this.config.get('FIXED_RATE', { infer: true }));

        // ---- Phase 1: validate every row, write nothing ----
        const prepared = rows.map((row) =>
            prepareBulkInvestmentRow(row, { investorById, projectById }),
        );

        const failedRows = prepared.filter((row) => row.errors.length > 0);

        if (failedRows.length > 0) {
            await this.auditRejectedBulkInvestment(
                prepared,
                failedRows.length,
                userId,
                admin,
                context,
            );

            // Only rejected rows are reported: all-or-nothing means the other
            // rows have no created or skipped state to expose.
            throw new UnprocessableEntityException({
                message:
                    'Investment bulk create rejected: no investments were created',
                success: false,
                data: {
                    totals: {
                        total: prepared.length,
                        created: 0,
                        failed: failedRows.length,
                    },
                    results: failedRows.map((row) => ({
                        rowNumber: row.row.rowNumber,
                        status: 'failed',
                        errors: row.errors,
                    })),
                },
            });
        }

        // ---- Phase 2: create the whole batch in one transaction ----

        // Tracks the row being written so a database error can be attributed to
        // a row number instead of the batch as a whole.
        let currentRow = 0;
        const results: BulkInvestmentRowResult[] = [];

        try {
            await this.prisma.$transaction(
                async (tx) => {
                    for (const preparedRow of prepared) {
                        const { row } = preparedRow;
                        currentRow = row.rowNumber;

                        const investment = await tx.investment.create({
                            data: buildBulkInvestmentData(
                                row,
                                projectById.get(row.projectId)!,
                                fallbackRate,
                            ),
                            select: INVESTMENT_ADMIN_SELECT,
                        });

                        // ----------------------------------------------------------
                        // ------------------------- AUDITLOG -----------------------
                        // ----------------------------------------------------------
                        await tx.auditLog.create({
                            data: {
                                adminName: admin?.name ?? 'Admin',
                                adminProfileId: admin?.id ?? null,
                                action: AuditAction.investment_bulk_created,
                                module: LogModule.INVESTMENT,
                                severity: LogSeverity.INFO,
                                status: LogStatus.SUCCESS,
                                targetLabel: `Investment Bulk Created: ${investorById.get(row.investorId)?.fullname ?? row.investorId}`,
                                targetTable: 'investments',
                                targetId: investment.id,
                                metadata: {
                                    source: 'bulk_create',
                                    rowNumber: row.rowNumber,
                                    batchSize: prepared.length,
                                } as unknown as Prisma.InputJsonValue,
                                newValue: toInvestmentSnapshot(investment) as unknown as Prisma.InputJsonValue,
                                ipAddress: context?.ipAddress ?? null,
                                userAgent: context?.userAgent ?? null,
                                sessionId: context?.sessionId ?? null,
                            },
                        });

                        results.push({
                            rowNumber: row.rowNumber,
                            status: 'created',
                            investmentId: investment.id,
                            errors: [],
                        });
                    }
                },
                { timeout: 20_000, maxWait: 5_000 },
            );
        } catch (err) {
            // The transaction has rolled back, so nothing was saved. Report
            // which row hit the database error.
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2003') {
                    throw new BadRequestException(
                        `Row ${currentRow}: one or more referenced records do not exist.`,
                    );
                }
                if (err.code === 'P2000') {
                    throw new BadRequestException(
                        `Row ${currentRow}: one of the provided values is too long for its field.`,
                    );
                }
            }
            throw err;
        }

        return {
            message: 'Investment bulk create completed',
            success: true,
            data: {
                totals: {
                    total: results.length,
                    created: results.length,
                    failed: 0,
                },
                results,
            },
        };
    }

    // ----------------------------------------------------------
    // -------------------- auditRejectedBulkInvestment ---------
    // ----------------------------------------------------------
    // Written outside any transaction: a rejected batch created no investment
    // row, but the attempt must still leave a trail.
    private async auditRejectedBulkInvestment(
        prepared: PreparedBulkInvestmentRow[],
        failedCount: number,
        userId: string,
        admin: { id: string; name: string | null } | null,
        context?: RequestAuditContext,
    ): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    adminName: admin?.name ?? 'Admin',
                    adminProfileId: admin?.id ?? null,
                    action: AuditAction.investment_bulk_create_rejected,
                    module: LogModule.INVESTMENT,
                    severity: LogSeverity.WARNING,
                    status: LogStatus.FAILED,
                    targetLabel: `Investment bulk create rejected: ${failedCount} of ${prepared.length} rows invalid`,
                    // No investment row was created, so the acting admin's user
                    // row is what the trail points at.
                    targetTable: 'users',
                    targetId: userId,
                    metadata: {
                        source: 'bulk_create',
                        totalRows: prepared.length,
                        failedRows: failedCount,
                        errorCount: prepared.reduce(
                            (count, row) => count + row.errors.length,
                            0,
                        ),
                        failedRowNumbers: prepared
                            .filter((row) => row.errors.length > 0)
                            .map((row) => row.row.rowNumber),
                    } as unknown as Prisma.InputJsonValue,
                    ipAddress: context?.ipAddress ?? null,
                    userAgent: context?.userAgent ?? null,
                    sessionId: context?.sessionId ?? null,
                },
            });
        } catch (err) {
            // The 422 is the answer the admin needs; the trail is best-effort.
            this.logger.error(
                'Failed to write investment bulk create rejected audit log',
                err as Error,
            );
        }
    }

    // ----------------------------------------------------------
    // ---------------------- updateInvestment ------------------
    // ----------------------------------------------------------
    async updateInvestment(
        id: string,
        updateInvestmentDto: UpdateInvestmentDto,
        userId?: string,
        context?: RequestAuditContext,
    ) {
        const {
            projectId, investmentDate, amount, investmentType,
            investmentPeriodMonths, disbursementPeriod, status,
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

        const [existingInvestment, admin, targetProject] = await Promise.all([
            this.prisma.investment.findUnique({
                where: { id },
                include: {
                    incomingPayments: { select: { status: true } },
                    investor: { select: { status: true } },
                },
            }),
            userId
                ? this.prisma.adminProfile.findUnique({
                    where: { userId },
                    select: { id: true, name: true },
                })
                : Promise.resolve(null),
            projectId !== undefined
                ? this.prisma.project.findUnique({
                    where: { id: projectId },
                    select: { id: true },
                })
                : Promise.resolve(null),
        ]);

        if (!existingInvestment) {
            throw new NotFoundException(`Investment with id ${id} not found`);
        }

        // Also used in service because if during update, pass one of the value of investmentPeriodMonths or disbursementPeriod.
        if (
            investmentPeriodMonths !== undefined ||
            disbursementPeriod !== undefined
        ) {
            const periodError = investmentPeriodDisbursementError({
                investmentPeriodMonths:
                    investmentPeriodMonths ??
                    existingInvestment.investmentPeriodMonths,
                disbursementPeriod:
                    disbursementPeriod ?? existingInvestment.disbursementPeriod,
            });
            if (periodError) {
                throw new BadRequestException(periodError);
            }
        }

        const projectChanged =
            projectId !== undefined && projectId !== existingInvestment.projectId;

        if (projectChanged && !targetProject) {
            throw new BadRequestException('Project not found');
        }

        // An active investment's date cannot be changed once set.
        // if (
        //     existingInvestment.status === InvestmentStatus.active &&
        //     investmentDate !== undefined
        // ) {
        //     throw new BadRequestException(
        //         'The investment date of an active investment cannot be changed',
        //     );
        // }

        const oldAmount = existingInvestment.amount;
        const newAmount = amount !== undefined ? new Prisma.Decimal(amount) : oldAmount;

        const oldStatus = existingInvestment.status;
        const newStatus = status ?? oldStatus;

        // Activation date is system-controlled: when the admin activates the
        // investment, the investment date is stamped with the current Dhaka
        // calendar date at that moment, ignoring any client-sent value.
        const activating =
            newStatus === InvestmentStatus.active &&
            oldStatus !== InvestmentStatus.active;

        if (activating) {
            data.investmentDate = getDhakaDateOnly();
        }


        if (!ALLOWED_STATUS_TRANSITIONS[oldStatus].includes(newStatus)) {
            throw new BadRequestException(
                statusTransitionError(oldStatus, newStatus),
            );
        }

        // The amount of a closed investment cannot be changed
        if (
            oldStatus === InvestmentStatus.closed &&
            amount !== undefined &&
            !newAmount.equals(oldAmount)
        ) {
            throw new BadRequestException(
                'The amount of a closed investment cannot be changed',
            );
        }

        if (
            oldStatus === InvestmentStatus.active &&
            newStatus === InvestmentStatus.closed &&
            amount !== undefined &&
            !newAmount.equals(oldAmount)
        ) {
            throw new BadRequestException(
                'The amount of an active investment cannot be changed while closing it',
            );
        }

        // Money still owed must not be left behind: every disbursement item of
        // the investment has to be marked disbursed before it can be closed.
        if (
            oldStatus === InvestmentStatus.active &&
            newStatus === InvestmentStatus.closed
        ) {
            const undisbursedCount = await this.prisma.disbursementItem.count({
                where: { investmentId: id, isDisbursed: false },
            });

            if (undisbursedCount > 0) {
                throw new BadRequestException(
                    `Investment cannot be closed while it has ${undisbursedCount} undisbursed disbursement item${undisbursedCount === 1 ? '' : 's'}`,
                );
            }
        }

        // Activating money requires a confirmed incoming payment.
        if (
            newStatus === InvestmentStatus.active &&
            oldStatus !== InvestmentStatus.active &&
            existingInvestment.incomingPayments?.status !==
            IncomingPaymentStatus.confirmed
        ) {
            throw new BadRequestException(
                'Investment cannot be activated due to incomplete payment',
            );
        }

        // ...and an investor who is themselves active. Suspended, deactivated,
        // or not-yet-approved investors must not have money activated.
        if (
            newStatus === InvestmentStatus.active &&
            oldStatus !== InvestmentStatus.active &&
            existingInvestment.investor?.status !== InvestorStatus.active
        ) {
            throw new BadRequestException(
                'Investment cannot be activated because the investor is not active',
            );
        }


        const oldContribution = contributionOf(oldStatus, oldAmount);
        const newContribution = contributionOf(newStatus, newAmount);

        const investorTotalDelta = newContribution.total.sub(
            oldContribution.total,
        );
        const investorActiveDelta = newContribution.active.sub(
            oldContribution.active,
        );

        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const updatedRow = await tx.investment
                    .update({
                        where: { id, updatedAt: existingInvestment.updatedAt },
                        data,
                        select: INVESTMENT_ADMIN_SELECT,
                    })
                    .catch((e: unknown) => {
                        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                            throw new ConflictException(
                                'Investment was modified by someone else. Reload and try again.',
                            );
                        }
                        throw e;
                    });

                if (projectChanged) {
                    await applyProjectTotals(
                        tx,
                        existingInvestment.projectId,
                        oldContribution.total.neg(),
                        oldContribution.active.neg(),
                    );
                    await applyProjectTotals(
                        tx,
                        projectId as string,
                        newContribution.total,
                        newContribution.active,
                    );
                } else {
                    await applyProjectTotals(
                        tx,
                        existingInvestment.projectId,
                        investorTotalDelta,
                        investorActiveDelta,
                    );
                }


                await applyInvestorTotals(
                    tx,
                    existingInvestment.investorId,
                    investorTotalDelta,
                    investorActiveDelta,
                );

                // ----------------------------------------------------------
                // ------------------------- AUDITLOG -----------------------
                // ----------------------------------------------------------
                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.investment_status_changed,
                        module: LogModule.INVESTMENT,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Investment Updated: ${updatedRow.id}`,
                        targetTable: 'investments',
                        targetId: updatedRow.id,
                        oldValue: toInvestmentSnapshot(existingInvestment) as unknown as Prisma.InputJsonValue,
                        newValue: toInvestmentSnapshot(updatedRow) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });

                return updatedRow;
            });

            return { message: 'Investment Updated Successfully', success: true, data: updated };
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

// ----------------------------------------------------------
// -------------------- toInvestmentSnapshot ----------------
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// ---------------------- applyProjectTotals ----------------
// ----------------------------------------------------------
async function applyProjectTotals(
    tx: Prisma.TransactionClient,
    projectId: string,
    totalDelta: Prisma.Decimal,
    activeDelta: Prisma.Decimal,
) {
    const data = {
        ...(!totalDelta.isZero() && {
            totalInvestedAmount: { increment: totalDelta },
        }),
        ...(!activeDelta.isZero() && {
            totalActiveInvestmentAmout: { increment: activeDelta },
        }),
    };

    if (Object.keys(data).length === 0) return;

    await tx.project.update({ where: { id: projectId }, data });
}

// ----------------------------------------------------------
// --------------------- applyInvestorTotals ----------------
// ----------------------------------------------------------
// Same idea for the investor's lifetime / active aggregates.
async function applyInvestorTotals(
    tx: Prisma.TransactionClient,
    investorId: string,
    totalDelta: Prisma.Decimal,
    activeDelta: Prisma.Decimal,
) {
    const data = {
        ...(!totalDelta.isZero() && {
            totalInvestmentAmount: { increment: totalDelta },
        }),
        ...(!activeDelta.isZero() && {
            totalActiveInvestmentAmout: { increment: activeDelta },
        }),
    };

    if (Object.keys(data).length === 0) return;

    await tx.investor.update({ where: { id: investorId }, data });
}

// ----------------------------------------------------------
// ------------------ PreparedBulkInvestmentRow --------------
// ----------------------------------------------------------
// One validated but not yet written bulk row, plus the row-level findings
// reported back to the admin.
type PreparedBulkInvestmentRow = {
    row: BulkInvestmentRowInput;
    errors: BulkInvestmentRowIssue[];
};

type BulkInvestmentProject = Prisma.ProjectGetPayload<{
    select: typeof INVESTMENT_BULK_PROJECT_SELECT;
}>;

// ----------------------------------------------------------
// ------------------ prepareBulkInvestmentRow --------------
// ----------------------------------------------------------
// Phase 1 of the bulk create: collect every problem with a row without
// writing anything, so the admin sees all bad rows in one response.
function prepareBulkInvestmentRow(
    row: BulkInvestmentRowInput,
    lookups: {
        investorById: Map<string, { id: string; fullname: string }>;
        projectById: Map<string, BulkInvestmentProject>;
    },
): PreparedBulkInvestmentRow {
    const errors: BulkInvestmentRowIssue[] = [];

    if (!lookups.investorById.has(row.investorId)) {
        errors.push({
            field: 'investorId',
            message: `Investor with id "${row.investorId}" not found`,
        });
    }

    const project = lookups.projectById.get(row.projectId);
    if (!project) {
        errors.push({
            field: 'projectId',
            message: `Project with id "${row.projectId}" not found`,
        });
    } else {
        // Without try-catch, if one row has an invalid investment amount, the exception immediately interrupts prepareBulkInvestmentRow().
        // But we want to collect the validation error inside the errors array.
        try {
            assertProjectAcceptsInvestment(
                project,
                new Prisma.Decimal(row.amount),
            );
        } catch (err) {
            if (err instanceof BadRequestException) {
                errors.push({
                    field: err.message.startsWith('Amount must be at least')
                        ? 'amount'
                        : 'projectId',
                    message: err.message,
                });
            } else {
                throw err;
            }
        }
    }

    // The contract enforces this too; re-checked here, like createInvestment,
    // so every service caller is covered.
    const periodError = investmentPeriodDisbursementError({
        investmentPeriodMonths: row.investmentPeriodMonths,
        disbursementPeriod: row.disbursementPeriod,
    });
    if (periodError) {
        errors.push({
            field: 'investmentPeriodMonths',
            message: periodError,
        });
    }

    return { row, errors };
}

// ----------------------------------------------------------
// ------------------- buildBulkInvestmentData --------------
// ----------------------------------------------------------
// Maps one validated bulk row to a Prisma create payload. The rate is derived
// the same way as createInvestment: project rate first, then active business
// settings, then the FIXED_RATE default.
function buildBulkInvestmentData(
    row: BulkInvestmentRowInput,
    project: BulkInvestmentProject,
    fallbackRate: Prisma.Decimal,
): Prisma.InvestmentCreateInput {
    const rate =
        row.investmentType === InvestmentType.fixed
            ? project.projectRate ?? fallbackRate
            : undefined;

    return {
        amount: new Prisma.Decimal(row.amount),
        investmentType: row.investmentType,
        investmentPeriodMonths: row.investmentPeriodMonths,
        disbursementPeriod: row.disbursementPeriod,
        ...(rate !== undefined && { rate }),
        investmentDate: row.investmentDate,
        ...(row.agreementEndDate !== undefined && {
            agreementEndDate: row.agreementEndDate,
        }),
        ...(row.agreementPlace !== undefined && {
            agreementPlace: row.agreementPlace,
        }),
        ...(row.deedOffical !== undefined && { deedOffical: row.deedOffical }),
        ...(row.deedGoverment !== undefined && {
            deedGoverment: row.deedGoverment,
        }),
        ...(row.chequeGiven !== undefined && { chequeGiven: row.chequeGiven }),
        ...(row.cashVoucharGiven !== undefined && {
            cashVoucharGiven: row.cashVoucharGiven,
        }),
        ...(row.souvenirGiven !== undefined && {
            souvenirGiven: row.souvenirGiven,
        }),
        ...(row.isSouvenirApplicable !== undefined && {
            isSouvenirApplicable: row.isSouvenirApplicable,
        }),
        ...(row.certificateGiven !== undefined && {
            certificateGiven: row.certificateGiven,
        }),
        ...(row.isCertificateApplicable !== undefined && {
            isCertificateApplicable: row.isCertificateApplicable,
        }),
        ...(row.specialInstruction !== undefined && {
            specialInstruction: row.specialInstruction,
        }),
        status: row.status,
        investor: { connect: { id: row.investorId } },
        project: { connect: { id: row.projectId } },
    };
}
