import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdminNotificationType,
  InvestmentStatus,
  InvestmentType,
  InvestorStatus,
  Prisma,
  ProjectStatus,
  Role,
} from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';

const INVESTMENT_LIST_SELECT = {
  id: true,
  investorId: true,
  projectId: true,
  project: { select: { name: true } },
  amount: true,
  rate: true,
  investmentType: true,
  investmentPeriodMonths: true,
  disbursementPeriod: true,
  // agreementPlace: true,
  status: true,
  investmentDate: true,
  agreementEndDate: true,
  // One-to-one: the investor's single payment submission for this investment
  // (null until they submit one)
  incomingPayments: {
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      status: true,
      dueDate: true,
      confirmedAt: true,
      // createdAt: true,
    },
  },
  // createdAt: true,
  investmentDocuments: true,
} satisfies Prisma.InvestmentSelect;

const PAYMENT_SORT_COLUMNS = {
  paymentMethod: 'paymentMethod',
  paymentStatus: 'status',
  paymentAmount: 'amount',
} as const satisfies Record<string, keyof Prisma.IncomingPaymentOrderByWithRelationInput>;


@Injectable()
export class InvestmentService {
  constructor(private readonly prisma: PrismaService) { }

  // Example: GET /api/investment?search=&status=active&investmentType=fixed&page=1&limit=10
  async findAll(query: InvestmentQueryDto, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const investor = await this.prisma.investor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!investor) {
      throw new ForbiddenException(
        'Complete your investor profile before viewing investments.',
      );
    }

    const {
      search,
      status,
      investmentType,
      disbursementPeriod,
      projectId,
      paymentMethod,
      paymentStatus,
      paymentAmount,
      minAmount,
      maxAmount,
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.InvestmentWhereInput = {
      investorId: investor.id,
      ...(status && { status }),
      ...(investmentType && { investmentType }),
      ...(disbursementPeriod && { disbursementPeriod }),
      ...(projectId && { projectId }),
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
      // Payment filters sit on the one-to-one IncomingPayment row: an
      // investment matches only when its payment satisfies every condition
      // sent, so investments without a payment are excluded by these filters.
      ...((paymentMethod !== undefined ||
        paymentStatus !== undefined ||
        paymentAmount !== undefined) && {
        incomingPayments: {
          ...(paymentMethod !== undefined && { paymentMethod }),
          // Query key is `paymentStatus`, the column is `status`.
          ...(paymentStatus !== undefined && { status: paymentStatus }),
          // Matches the payment when it is at least this amount.
          ...(paymentAmount !== undefined && { amount: { gte: paymentAmount } }),
        },
      }),
      // Free-text search over the project of the caller's own investments.
      ...(search && {
        project: {
          name: { contains: search, mode: 'insensitive' },
        },
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

    // 2. Fetch the current page and the total count in parallel.
    const [investments, total] = await Promise.all([
      this.prisma.investment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: INVESTMENT_LIST_SELECT,
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

  async findOne(id: string, user: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const investment = await this.prisma.investment.findUnique({
      where: { id },
      select: {
        ...INVESTMENT_LIST_SELECT,
        investor: { select: { userId: true } },
      },
    });

    if (
      !investment ||
      (user.role !== Role.SUPER_ADMIN &&
        investment.investor.userId !== user.userId)
    ) {
      throw new NotFoundException('Invalid investment!');
    }

    // const { investor, ...data } = investment;

    return {
      message: 'Investment fetched successfully',
      success: true,
      data: investment,
    };
  }

  async create(dto: CreateInvestmentDto, userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const amount = new Prisma.Decimal(dto.amount);

    const [investor, project] = await Promise.all([
      this.prisma.investor.findUnique({
        where: { userId },
        select: { id: true, fullname: true, status: true },
      }),
      this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: {
          id: true,
          status: true,
          isActive: true,
          isVisible: true,
          startDate: true,
          endDate: true,
          minimumInvestment: true,
          maximumInvestment: true,
        },
      }),
    ]);

    if (!investor) {
      throw new ForbiddenException(
        'Complete your investor profile before creating an investment.',
      );
    }

    // if (investor.status != InvestorStatus.active ) {
    //   throw new ForbiddenException(
    //     'Only investors who have uploaded KYC can create an investment.',
    //   );
    // }

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    this.assertProjectAcceptsInvestment(project, amount);

    const databaseRate = await this.prisma.fixedRate.findFirst({
      where: { isActive: true },
    })

    const rate = databaseRate?.rate || process.env.FIXED_RATE;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const investment = await tx.investment.create({
          data: {
            amount,
            investmentType: dto.investmentType,
            rate,
            investmentPeriodMonths: dto.investmentPeriodMonths,
            disbursementPeriod: dto.disbursementPeriod,
            // Default to "now" so later slot math has a date even if the
            // client omitted investmentDate.
            investmentDate: dto.investmentDate ?? new Date(),
            status: 'pending',
            investor: { connect: { id: investor.id } },
            project: { connect: { id: project.id } },
          },
          // select: INVESTMENT_CREATE_SELECT,
        });

        await tx.adminNotification.create({
          data: {
            type: 'new_investment_request' as AdminNotificationType,
            referenceId: investment.id,
            // AdminNotification.message is VARCHAR(255).
            message: `New investment request: ${investor.fullname} — ${amount.toFixed(2)}`.slice(
              0,
              255,
            ),
            isRead: false,
            clickLink: `/admin/investment/${investment.id}`,
          },
        });

        return {
          message: 'Investment Created Successfully',
          success: true,
          // data: investment,
        };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          'One or more referenced records do not exist.',
        );
      }
      throw err;
    }
  }

  async update(
    id: string,
    updateInvestmentDto: UpdateInvestmentDto,
    userId: string | undefined,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const {
      amount,
      investmentType,
      investmentPeriodMonths,
      disbursementPeriod,
    } = updateInvestmentDto;

    const newAmount =
      amount !== undefined ? new Prisma.Decimal(amount) : undefined;

    const data: Prisma.InvestmentUpdateManyMutationInput = {
      ...(newAmount !== undefined && { amount: newAmount }),
      ...(investmentType !== undefined && { investmentType }),
      ...(investmentPeriodMonths !== undefined && { investmentPeriodMonths }),
      ...(disbursementPeriod !== undefined && { disbursementPeriod }),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const [investor, existing] = await Promise.all([
      this.prisma.investor.findUnique({
        where: { userId },
        select: { id: true },
      }),
      this.prisma.investment.findFirst({
        where: { id, investor: { userId } },
      }),
    ]);

    if (!investor) {
      throw new ForbiddenException(
        'Complete your investor profile before updating an investment.',
      );
    }

    if (!existing) {
      throw new NotFoundException('Investment not found!');
    }

    const wasActive = existing.status === InvestmentStatus.active;
    if (wasActive) {
      data.status = InvestmentStatus.pending;
    }

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.investment.updateMany({
        where: { id, updatedAt: existing.updatedAt },
        data,
      });

      if (count === 0) {
        throw new ConflictException(
          'Investment was modified',
        );
      }

      if (wasActive) {
        await tx.project.update({
          where: { id: existing.projectId },
          data: { totalInvestedAmount: { decrement: existing.amount } },
        });

        await tx.investor.update({
          where: { id: existing.investorId },
          data: { totalInvestmentAmount: { decrement: existing.amount } },
        });
      }
    });

    return {
      message: 'Investment Updated Successfully',
    };
  }

  private assertProjectAcceptsInvestment(
    project: {
      status: ProjectStatus;
      isActive: boolean;
      isVisible: boolean;
      startDate: Date;
      endDate: Date | null;
      minimumInvestment: Prisma.Decimal;
      maximumInvestment: Prisma.Decimal | null;
    },
    amount: Prisma.Decimal,
  ) {
    if (
      !project.isActive ||
      !project.isVisible ||
      project.status !== ProjectStatus.OPEN
    ) {
      throw new BadRequestException(
        'This project is not currently open for investment.',
      );
    }

    const now = new Date();
    if (project.startDate > now) {
      throw new BadRequestException('This project has not opened yet.');
    }
    if (project.endDate && project.endDate < now) {
      throw new BadRequestException('This project is no longer accepting investments.');
    }

    if (amount.lt(project.minimumInvestment)) {
      throw new BadRequestException(
        `Amount must be at least ${project.minimumInvestment.toFixed(2)}.`,
      );
    }
  }
}
