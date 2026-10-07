import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
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
    incomingPayments: {
        orderBy: [
            { installmentNumber: 'asc' as const },
            { createdAt: 'asc' as const },
        ],
    },
} satisfies Prisma.InvestmentSelect;

// Query sort keys that map directly to an Investment column. `paymentMethod`
// and `paymentStatus` live on the related IncomingPayment rows (one-to-many),
// which Prisma cannot order by from this side, so they are left out and any
// such key falls back to createdAt.
const INVESTMENT_SORTABLE_COLUMNS = [
    'amount',
    'rate',
    'investmentDate',
    'investmentPeriodMonths',
    'status',
    'createdAt',
] as const;

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
            // Payment filters sit on the related IncomingPayment rows: keep an
            // investment when it has at least one payment matching every given
            // condition.
            ...((paymentMethod !== undefined ||
                paymentStatus !== undefined ||
                paymentAmount !== undefined) && {
                incomingPayments: {
                    some: {
                        ...(paymentMethod !== undefined && { paymentMethod }),
                        // Query key is `paymentStatus`, the column is `status`.
                        ...(paymentStatus !== undefined && { status: paymentStatus }),
                        // Matches payments of at least this amount.
                        ...(paymentAmount !== undefined && {
                            amount: { gte: paymentAmount },
                        }),
                    },
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
                    { project: { name: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        };

        // 2. ORDER BY — see INVESTMENT_SORTABLE_COLUMNS for why only some keys
        //    can be used directly.
        const canSortByColumn = (
            INVESTMENT_SORTABLE_COLUMNS as readonly string[]
        ).includes(sortBy);

        const orderBy: Prisma.InvestmentOrderByWithRelationInput[] = [
            canSortByColumn ? { [sortBy]: sortOrder } : { createdAt: sortOrder },
            // Tie-breaker on id keeps pagination deterministic.
            { id: 'asc' as const },
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

    // For updating Investment Information
    async update(id: string, updateInvestmentDto: UpdateInvestmentDto){
        return {
            message: 'Investment Updated Successfully'
        }
    }

}
