import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdminNotificationType,
  InvestmentType,
  InvestorStatus,
  Prisma,
  ProjectStatus,
} from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';

// Investor-facing response — no admin-only fields (rate, deed, souvenir
// flags, etc.). Those are set later on the admin approval path.
const INVESTMENT_CREATE_SELECT = {
  id: true,
  projectId: true,
  amount: true,
  investmentType: true,
  investmentPeriodMonths: true,
  disbursementPeriod: true,
  status: true,
  investmentDate: true,
  createdAt: true,
} satisfies Prisma.InvestmentSelect;

// Create is allowed only after KYC documents are uploaded. pending /
// active / suspended go through other flows.

@Injectable()
export class InvestmentService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /investment?search=&status=active&investmentType=fixed&page=1&limit=10
  async findAll(query: InvestmentQueryDto) {
    return 'Return all investment List';
  }

  async findOne(id: string) {
    return (
      id +
      'This route is for Investment who will see their necessary data and partially modify data'
    );
  }

  // POST /api/investment — investor submits a new commitment.
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

    // Fixed-rate investments carry a default agreed rate from day one;
    // unfixed ones leave `rate` unset so it is driven by the admin / monthly
    // rate settings instead.
    const rate =
      dto.investmentType === InvestmentType.fixed ? 2.5 : undefined;

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

        // targetAmount is informational only — overshoot is allowed.
        await tx.project.update({
          where: { id: project.id },
          data: { totalInvestedAmount: { increment: amount } },
        });

        await tx.investor.update({
          where: { id: investor.id },
          data: { totalInvestmentAmount: { increment: amount } },
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

  async update(id: string, updateInvestmentDto: UpdateInvestmentDto) {
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
