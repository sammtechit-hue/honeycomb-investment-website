import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  InvestorStatus,
  LogModule,
  LogSeverity,
  LogStatus,
  Prisma,
  VerificationStatus,
} from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorQueryDto } from './dto/query-investor.dto';

const INVESTOR_UPDATE_INCLUDE = {
  nominee: true,
  kycDocuments: true,
  bankAccount: true,
  user: { select: { id: true, email: true, phone: true } },
} satisfies Prisma.InvestorInclude;

type InvestorWithRelations = Prisma.InvestorGetPayload<{
  include: typeof INVESTOR_UPDATE_INCLUDE;
}>;

@Injectable()
export class InvestorService {
  constructor(private readonly prisma: PrismaService) { }

  // GET /api/admin/investor
  async findAll(query: InvestorQueryDto) {
    const {
      search,
      status,
      category,
      selectedBank,
      accountType,
      kycVerificationStatus,
      approvedBy,
      page,
      limit,
      sortBy,
      sortOrder,
      minTotalInvestment,
      maxTotalInvestment,
    } = query;

    // 1. Build the WHERE clause from whichever filters were provided.
    const where: Prisma.InvestorWhereInput = {
      ...(status && { status }),
      ...(category && { category }),
      ...(approvedBy && { approvedBy }),
      ...(kycVerificationStatus && {
        kycDocuments: { verificationStatus: kycVerificationStatus },
      }),
      ...((selectedBank !== undefined || accountType !== undefined) && {
        bankAccount: {
          some: {
            //Find investors who have at least one bank account where selectedBank = "DBBL".
            ...(selectedBank !== undefined && { selectedBank }),
            ...(accountType !== undefined && { accountType }),
          },
        },
      }),
      ...((minTotalInvestment !== undefined ||
        maxTotalInvestment !== undefined) && {
        totalInvestmentAmount: {
          ...(minTotalInvestment !== undefined && { gte: minTotalInvestment }),
          ...(maxTotalInvestment !== undefined && { lte: maxTotalInvestment }),
        },
      }),
      ...(search && {
        OR: [
          { fullname: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    // Map API sort keys to Prisma fields. `fullName` -> `fullname` column,
    // `email` lives on the related User row, everything else is a direct column.
    const orderBy: Prisma.InvestorOrderByWithRelationInput[] = [
      sortBy === 'email'
        ? { user: { email: sortOrder } }
        : sortBy === 'fullName'
          ? { fullname: sortOrder }
          : { [sortBy]: sortOrder },
      // Tie-breaker on id keeps pagination deterministic.
      { id: 'asc' as const },
    ];

    const [investors, total] = await Promise.all([
      this.prisma.investor.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true, phone: true } },
          nominee: true,
          kycDocuments: true,
          bankAccount: true,
        },
      }),
      this.prisma.investor.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      message: 'Investors fetched successfully',
      success: true,
      data: investors,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const investor = await this.prisma.investor.findUnique({
      where: { id },
    });

    if (!investor) {
      throw new NotFoundException('Investor not found');
    }

    return {
      message: 'Investor fetched successfully',
      success: true,
      data: investor,
    };
  }

  async create(dto: CreateInvestorDto) {
    return 'Investor Data';
  }

  // PATCH /api/admin/investor/:id — any provided investor / nested / contact
  // field is written. approvedAt / approvedBy are system-stamped from the
  // acting admin's session whenever the status transitions to `active`.
  async update(
    id: string,
    dto: UpdateInvestorDto,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const {
      fullName,
      address,
      profession,
      workplace,
      status,
      category,
      email,
      phone,
      nominee,
      kycDocuments,
    } = dto;

    if (
      [
        fullName,
        address,
        profession,
        workplace,
        status,
        category,
        email,
        phone,
        nominee,
        kycDocuments,
      ].every((v) => v === undefined)
    ) {
      throw new BadRequestException('No fields provided to update');
    }

    // Independent lookups, run in parallel
    const [existing, admin] = await Promise.all([
      this.prisma.investor.findUnique({
        where: { id },
        include: INVESTOR_UPDATE_INCLUDE,
      }),
      this.prisma.adminProfile.findUnique({
        where: { userId },
        select: { id: true, name: true },
      }),
    ]);
    
    if (!existing) {
      throw new NotFoundException(`Investor with id ${id} not found`);
    }

    const becomingActive =
      status === InvestorStatus.active && existing.status !== InvestorStatus.active;

    const investorData: Prisma.InvestorUpdateInput = {
      fullname: fullName,
      address,
      profession,
      workplace,
      status,
      category,
      // System-stamped on ANY transition to `active` (e.g. kyc_uploaded ->
      // active approval, or suspended -> active re-approval): time = now,
      // approver = the acting admin. Non-active transitions leave both untouched.
      ...(becomingActive && { approvedAt: new Date(), approvedBy: userId }),
      ...this.nomineeNestedWrite(existing, nominee),
      ...this.kycNestedWrite(existing, kycDocuments),
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        let updated: InvestorWithRelations;
        try {
          updated = await tx.investor.update({
            where: { id, updatedAt: existing.updatedAt },  // if only used Id, Admin A could overwrite Admin B's changes.
            data: investorData,
            include: INVESTOR_UPDATE_INCLUDE,
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            throw new ConflictException(
              'Investor was modified by someone else. Reload and try again.',
            );
          }
          throw e;
        }

        if (email !== undefined || phone !== undefined) {
          await tx.user.update({
            where: { id: existing.userId },
            data: {
              ...(email !== undefined && { email: email.toLowerCase() }),
              ...(phone !== undefined && { phone }),
            },
          });
          if (email !== undefined) updated.user.email = email.toLowerCase();
          if (phone !== undefined) updated.user.phone = phone;
        }

        await tx.auditLog.create({
          data: {
            adminName: admin?.name ?? 'Admin',
            adminProfileId: admin?.id ?? null,
            action: pickAuditAction(existing, {
              status,
              kycVerificationStatus: kycDocuments?.verificationStatus,
            }),
            module: pickLogModule({ status, kycDocuments, nominee }),
            severity: LogSeverity.INFO,
            status: LogStatus.SUCCESS,
            targetLabel: `Investor Updated: ${updated.fullname}`,
            targetTable: 'investors',
            targetId: updated.id,
            oldValue: toInvestorSnapshot(existing) as unknown as Prisma.InputJsonValue,
            newValue: toInvestorSnapshot(updated) as unknown as Prisma.InputJsonValue,
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
            sessionId: context?.sessionId ?? null,
          },
        });
      });

      return { message: 'Investor Updated Successfully', success: true };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            'Email or phone is already in use by another account.',
          );
        }
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

  async remove(id: string) {
    return { message: 'Investor has been suspended successfully' };
  }

  private nomineeNestedWrite(
    existing: InvestorWithRelations,
    nominee: UpdateInvestorDto['nominee'],
  ): Pick<Prisma.InvestorUpdateInput, 'nominee'> {
    if (nominee === undefined) return {};

    if (existing.nominee) {
      return { nominee: { update: nominee } };
    }

    if (!nominee.nomineeName || !nominee.nomineePhone || !nominee.relation) {
      throw new BadRequestException(
        'nomineeName, nomineePhone and relation are required to create a nominee.',
      );
    }

    return {
      nominee: {
        create: {
          nomineeName: nominee.nomineeName,
          nomineePhone: nominee.nomineePhone,
          relation: nominee.relation,
          nomineeNidFront: nominee.nomineeNidFront,
          nomineeNidBack: nominee.nomineeNidBack,
          nomineePhoto: nominee.nomineePhoto,
        },
      },
    };
  }

  private kycNestedWrite(
    existing: InvestorWithRelations,
    kycDocuments: UpdateInvestorDto['kycDocuments'],
  ): Pick<Prisma.InvestorUpdateInput, 'kycDocuments'> {
    if (kycDocuments === undefined) return {};

    if (existing.kycDocuments) {
      return { kycDocuments: { update: kycDocuments } };
    }

    if (!kycDocuments.nidFront || !kycDocuments.nidBack || !kycDocuments.photo) {
      throw new BadRequestException(
        'nidFront, nidBack and photo are required to create KYC documents.',
      );
    }

    return {
      kycDocuments: {
        create: {
          nidFront: kycDocuments.nidFront,
          nidBack: kycDocuments.nidBack,
          photo: kycDocuments.photo,
          verificationStatus: kycDocuments.verificationStatus ?? 'verified',
        },
      },
    };
  }
}

function pickLogModule(next: {
  status?: InvestorStatus;
  kycDocuments?: UpdateInvestorDto['kycDocuments'];
  nominee?: UpdateInvestorDto['nominee'];
}): LogModule {
  if (next.status !== undefined) return LogModule.INVESTOR;
  if (next.kycDocuments !== undefined) return LogModule.KYC;
  if (next.nominee !== undefined) return LogModule.NOMINEE;
  return LogModule.INVESTOR;
}

function pickAuditAction(
  existing: InvestorWithRelations,
  next: {
    status?: InvestorStatus;
    kycVerificationStatus?: VerificationStatus;
  },
): AuditAction {



  if (next.status === InvestorStatus.active && existing.status !== InvestorStatus.active) {
    return AuditAction.investor_verified;
  }
  if (next.status !== undefined && next.status !== existing.status) {
    return AuditAction.investor_status_changed;
  }
  if (
    next.kycVerificationStatus !== undefined &&
    next.kycVerificationStatus !== existing.kycDocuments?.verificationStatus
  ) {
    return AuditAction.investor_kyc_status_changed;
  }
  return AuditAction.investor_information_updated;
}

function toInvestorSnapshot(investor: InvestorWithRelations) {
  return {
    fullName: investor.fullname,
    address: investor.address,
    profession: investor.profession,
    workplace: investor.workplace,
    category: investor.category,
    status: investor.status,
    totalInvestmentAmount: Number(investor.totalInvestmentAmount),
    approvedAt: investor.approvedAt?.toISOString() ?? null,
    approvedBy: investor.approvedBy,
    email: investor.user.email,
    phone: investor.user.phone,
    nominee: investor.nominee,
    kycDocuments: investor.kycDocuments
      ? {
        nidFront: investor.kycDocuments.nidFront,
        nidBack: investor.kycDocuments.nidBack,
        photo: investor.kycDocuments.photo,
        verificationStatus: investor.kycDocuments.verificationStatus,
      }
      : null,
    bankAccount: investor.bankAccount.map((row) => ({
      id: row.id,
      selectedBank: row.selectedBank,
      bankName: row.bankName,
      accountName: row.accountName,
      accountNumber: row.accountNumber,
      routingNumber: row.routingNumber,
      accountType: row.accountType,
      branchName: row.branchName,
      isActive: row.isActive,
    })),
  };
}
