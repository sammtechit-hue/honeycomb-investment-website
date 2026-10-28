import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdminNotificationType,
  AuditAction,
  EditRequestStatus,
  InvestmentStatus,
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
import {
  InvestorEditRequestQueryDto,
  InvestorEditRequestReviewDto,
} from './dto/InvestorEditRequest';
import { BankAccountQueryDto } from './dto/bankaccount';

const INVESTOR_UPDATE_INCLUDE = {
  nominee: true,
  kycDocuments: true,
  bankAccount: true,
  user: { select: { email: true, phone: true } },
} satisfies Prisma.InvestorInclude;

type InvestorWithRelations = Prisma.InvestorGetPayload<{
  include: typeof INVESTOR_UPDATE_INCLUDE;
}>;

// Everything the review (merge/reject) flow needs in one read. The staged
// rows are included bare because their fields are written onto the live
// records; note the passwordHash on EditableUser is only ever moved into the
// user row, never returned to a client.
const REVIEW_EDIT_REQUEST_INCLUDE = {
  investor: {
    select: {
      id: true,
      userId: true,
      fullname: true,
      nominee: { select: { id: true } },
      kycDocuments: { select: { id: true } },
    },
  },
  editableInvestor: true,
  editableNominee: true,
  // Relation key on InvestorEditRequest for the staged KYC row (the
  // referenced model itself is EditableInvestorKycDocuments).
  editableKycDocument: true,
  editableUser: true,
} satisfies Prisma.InvestorEditRequestInclude;

type ReviewEditRequest = Prisma.InvestorEditRequestGetPayload<{
  include: typeof REVIEW_EDIT_REQUEST_INCLUDE;
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

  // GET /api/admin/investor/:id/bank-account
  async findInvestorBankAccounts(id: string, query: BankAccountQueryDto) {
    const investor = await this.prisma.investor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!investor) {
      throw new NotFoundException(`Investor with id ${id} not found`);
    }

    const { search, selectedBank, accountType, isActive, page, limit, sortBy, sortOrder } = query;
    const where: Prisma.InvestorBankAccountWhereInput = {
      investorId: investor.id,
      ...(selectedBank !== undefined && { selectedBank }),
      ...(accountType !== undefined && { accountType }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { bankName: { contains: search, mode: 'insensitive' } },
          { accountName: { contains: search, mode: 'insensitive' } },
          { accountNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.InvestorBankAccountOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { id: 'asc' },
    ];

    const [bankAccounts, total] = await Promise.all([
      this.prisma.investorBankAccount.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          selectedBank: true,
          bankName: true,
          accountName: true,
          accountNumber: true,
          routingNumber: true,
          accountType: true,
          branchName: true,
          isActive: true,
          investorId: true,
        },
      }),
      this.prisma.investorBankAccount.count({ where }),
    ]);

    return {
      message: 'Investor bank accounts fetched successfully',
      success: true,
      data: bankAccounts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET /api/admin/investor/:id
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

  // GET /api/admin/investor/edit-requests
  async findAllEditRequests(query: InvestorEditRequestQueryDto) {
    const {
      search,
      status,
      investorId,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.InvestorEditRequestWhereInput = {
      ...(status && { status }),
      ...(investorId && { investorId }),
      ...(search && {
        investor: {
          OR: [
            { fullname: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search, mode: 'insensitive' } } },
          ],
        },
      }),
    };

    const orderBy: Prisma.InvestorEditRequestOrderByWithRelationInput[] = [
      sortBy === 'status' ? { status: sortOrder } : { createdAt: sortOrder },
      // Tie-breaker on id keeps pagination deterministic.
      { id: 'asc' as const },
    ];

    const [editRequests, total] = await Promise.all([
      this.prisma.investorEditRequest.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        // Explicit select so credential fields (passwordHash etc.) never leak.
        include: {
          investor: {
            select: {
              fullname: true,
              status: true,
              user: { select: { email: true, phone: true } },
            },
          },
        },
      }),
      this.prisma.investorEditRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      message: 'Investor edit requests fetched successfully',
      success: true,
      data: editRequests,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // GET /api/admin/investor/edit-requests/:id
  async findInvestorEditRequests(id: string) {
    const editRequest = await this.prisma.investorEditRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        reviewedBy: true,
        reviewedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        investor: {
          select: {
            id: true,
            fullname: true,
            status: true,
            user: { select: { email: true, phone: true } },
          },
        },
        editableInvestor: true,
        editableNominee: true,
        editableKycDocument: true,
        editableUser: {
          select: {
            id: true,
            email: true,
            phone: true,
            passwordHash: true,
            isActivated: true,
            activatedAt: true,
            createdAt: true,
            editRequestId: true,
          },
        },
      },
    });

    if (!editRequest) {
      throw new NotFoundException(
        `Investor edit request with id ${id} not found`,
      );
    }

    const {
      investor,
      editableInvestor,
      editableNominee,
      editableKycDocument,
      editableUser,
      ...request
    } = editRequest;

    // Staged contact edits never expose passwordHash — only whether a new
    // password is waiting for review.
    let stagedUserEdit = null;

    if (editableUser) {
      const { passwordHash, ...staged } = editableUser;

      stagedUserEdit = {
        ...staged,
        passwordGiven: !!passwordHash,
      };
    }

    return {
      message: 'Investor edit request fetched successfully',
      success: true,
      data: {
        investor,
        editRequest: request,
        pendingEdits: {
          investor: editableInvestor,
          nominee: editableNominee,
          kycDocuments: editableKycDocument,
          user: stagedUserEdit,
        },
      },
    };
  }

  // Merge investor Edit Request
  // ----------------------------------------------
  async reviewInvestorEditRequests(
    id: string,
    dto: InvestorEditRequestReviewDto,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const admin = await this.prisma.adminProfile.findUnique({
      where: { userId },
      select: { id: true, name: true },
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.investorEditRequest.findUnique({
          where: { id },
          include: REVIEW_EDIT_REQUEST_INCLUDE,
        });

        if (!request) {
          throw new NotFoundException(
            `Investor edit request with id ${id} not found`,
          );
        }

        // APPROVED / REJECTED are final — a reviewed request cannot be
        // re-applied (or re-merged) through this route.
        if (request.status !== EditRequestStatus.PENDING) {
          throw new ConflictException(
            `Edit request is already ${request.status} and cannot be applied again`,
          );
        }

        const approving = dto.status === EditRequestStatus.APPROVED;

        if (
          approving &&
          !request.editableInvestor &&
          !request.editableNominee &&
          !request.editableKycDocument &&
          !request.editableUser
        ) {
          throw new BadRequestException(
            'This edit request has no staged changes to merge',
          );
        }

        let applied: Partial<Record<'nominee' | 'kycDocuments' | 'user', true>> = {};

        if (approving) {
          applied = await this.mergeStagedRows(tx, request);
        }

        
        let reviewedReviewColumns;
        try {
          reviewedReviewColumns = await tx.investorEditRequest.update({
            where: { id, status: EditRequestStatus.PENDING },
            data: {
              status: dto.status,
              reviewedBy: userId,
              reviewedAt: new Date(),
              ...(dto.rejectionReason !== undefined && {
                rejectionReason: dto.rejectionReason,
              }),
            },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          ) {
            throw new ConflictException(
              'Edit request was reviewed by someone else. Reload and try again.',
            );
          }
          throw e;
        }

        // Staged rows move to "applied" only on approval. A rejected request
        // keeps its rows untouched — the investor's next submission
        // overwrites them anyway.
        if (approving) {
          await Promise.all([
            tx.editableInvestor.updateMany({
              where: { editRequestId: id },
              data: { isActivated: true, activatedAt: new Date() },
            }),
            tx.editableNominee.updateMany({
              where: { editRequestId: id },
              data: { isActivated: true, activatedAt: new Date() },
            }),
            tx.editableInvestorKycDocuments.updateMany({
              where: { editRequestId: id },
              data: { isActivated: true, activatedAt: new Date() },
            }),
            tx.editableUser.updateMany({
              where: { editRequestId: id },
              data: { isActivated: true, activatedAt: new Date() },
            }),
          ]);
        }

        await tx.auditLog.create({
          data: {
            adminName: admin?.name ?? 'Admin',
            adminProfileId: admin?.id ?? null,
            action: AuditAction.investor_information_updated,
            module: LogModule.INVESTOR,
            severity: LogSeverity.INFO,
            status: LogStatus.SUCCESS,
            targetLabel: `Investor Edit Request ${dto.status}: ${request.investor.fullname}`,
            targetTable: 'investor_edit_requests',
            targetId: request.id,
            oldValue: {
              status: EditRequestStatus.PENDING,
              ...toStagedSnapshot(request),
            } as unknown as Prisma.InputJsonValue,
            newValue: {
              status: dto.status,
              reviewedBy: userId,
              rejected: !approving,
              merged: approving ? applied : null,
              rejectionReason: dto.rejectionReason ?? null,
            } as unknown as Prisma.InputJsonValue,
            metadata: {
              investorId: request.investorId,
            } as unknown as Prisma.InputJsonValue,
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
            sessionId: context?.sessionId ?? null,
          },
        });

        await tx.adminNotification.create({
          data: {
            type: 'investor_action' as AdminNotificationType,
            referenceId: request.investorId,
            message: `${request.investor.fullname}'s edit request was ${dto.status}${
              approving
                ? ` and merged (${Object.keys(applied).join(', ') || 'nothing to merge'})`
                : `: ${dto.rejectionReason}`
            }`,
            isRead: false,
            clickLink: `/admin/investors/${request.investorId}`,
          },
        });

        return {
          message: approving
            ? 'Investor edit request approved and merged'
            : 'Investor edit request rejected',
          success: true,
          data: {
            id: reviewedReviewColumns.id,
            status: reviewedReviewColumns.status,
            reviewedBy: reviewedReviewColumns.reviewedBy,
            reviewedAt: reviewedReviewColumns.reviewedAt,
            rejectionReason: reviewedReviewColumns.rejectionReason,
            investorId: reviewedReviewColumns.investorId,
          },
        };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            'The staged email or phone is already in use by another account.',
          );
        }
        if (err.code === 'P2000') {
          throw new BadRequestException(
            'A staged value is too long for its field.',
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

  
  private async mergeStagedRows(
    tx: Prisma.TransactionClient,
    request: ReviewEditRequest,
  ): Promise<Partial<Record<'nominee' | 'kycDocuments' | 'user', true>>> {
    const {
      investor,
      editableInvestor,
      editableNominee,
      editableKycDocument,
      editableUser,
    } = request;
    const merged: Partial<Record<'nominee' | 'kycDocuments' | 'user', true>> = {};

    if (editableInvestor) {
      const fields = stagedFields({
        address: editableInvestor.address,
        profession: editableInvestor.profession,
        workplace: editableInvestor.workplace,
      });

      if (Object.keys(fields).length) {
        await tx.investor.update({
          where: { id: investor.id },
          data: fields,
        });
      }
    }

    if (editableNominee && investor.nominee) {
      const fields = stagedFields({
        nomineeName: editableNominee.nomineeName,
        nomineePhone: editableNominee.nomineePhone,
        relation: editableNominee.relation,
        nomineeNidFront: editableNominee.nomineeNidFront,
        nomineeNidBack: editableNominee.nomineeNidBack,
        nomineePhoto: editableNominee.nomineePhoto,
      });

      if (Object.keys(fields).length) {
          await tx.nominee.update({
            where: { id: investor.nominee.id },
            data: fields,
          });
        merged.nominee = true;
      }
    }

    if (editableKycDocument && investor.kycDocuments) {
      const fields = stagedFields({
        nidFront: editableKycDocument.nidFront,
        nidBack: editableKycDocument.nidBack,
        photo: editableKycDocument.photo,
      });

      if (Object.keys(fields).length) {
          await tx.investorKycDocument.update({
            where: { id: investor.kycDocuments.id },
            data: fields,
          });
        merged.kycDocuments = true;
      }
    }

    if (editableUser && investor.userId) {
      const fields = stagedFields({
        email: editableUser.email,
        phone: editableUser.phone,
        passwordHash: editableUser.passwordHash,
      });

      if (Object.keys(fields).length) {
        await tx.user.update({
          where: { id: investor.userId },
          data: fields,
        });
        merged.user = true;
      }
    }

    return merged;
  }

  async create(dto: CreateInvestorDto) {
    return 'Investor Data';
  }


  async updateInvestor(
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

    // "Other information" is anything besides the status field itself.
    const hasOtherFields =
      fullName !== undefined ||
      address !== undefined ||
      profession !== undefined ||
      workplace !== undefined ||
      category !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      nominee !== undefined ||
      kycDocuments !== undefined;

    // A suspension request must carry status only — no other field may be
    if (status === InvestorStatus.suspended && hasOtherFields) {
      throw new BadRequestException(
        'Cannot change other information while suspending an investor',
      );
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

    // An active investor can't revert to an earlier onboarding stage — the
    // only permitted status change from active is suspension.
    if (
      existing.status === InvestorStatus.active &&
      (status === InvestorStatus.pending ||
        status === InvestorStatus.uploaded_kyc)
    ) {
      throw new BadRequestException(
        'An active investor cannot go back to pending or uploaded_kyc. The only permitted status change is suspension.',
      );
    }

    // if (existing.status === InvestorStatus.suspended && hasOtherFields) {
    //   throw new BadRequestException(
    //     'Investor is suspended, so their information cannot be changed',
    //   );
    // }

    // Deactivation is a final state: nothing but the status column may be
    // touched on a deactivated investor.
    // if (existing.status === InvestorStatus.deactivated && hasOtherFields) {
    //   throw new BadRequestException(
    //     'Investor is deactivated, so their information cannot be changed',
    //   );
    // }

    // An investor can't be suspended while any of their investments are still
    // running — all investments must be closed first (see InvestorStatus.suspended).
    const becomingSuspended =
      status === InvestorStatus.suspended &&
      existing.status !== InvestorStatus.suspended;

    if (becomingSuspended) {
      const activeInvestments = await this.prisma.investment.count({
        where: { investorId: id, status: InvestmentStatus.active },
      });

      if (activeInvestments > 0) {
        throw new BadRequestException(
          'Investor cannot be suspended while they have active investments. Close all active investments first.',
        );
      }
    }

    // for approvedate
    const becomingActive =
      status === InvestorStatus.active && existing.status !== InvestorStatus.active;

    const investorData: Prisma.InvestorUpdateInput = {
      fullname: fullName,
      address,
      profession,
      workplace,
      status,
      category,
      ...(becomingActive && { approvedAt: new Date(), approvedBy: userId }),
      ...this.nomineeNestedWrite(existing, nominee),
      ...this.kycNestedWrite(existing, kycDocuments),
    };

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
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

        return updated;
      });

      return {
        message: 'Investor Updated Successfully',
        success: true,
        data: updated,
      };
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

  // PATCH /api/admin/investor/:id/deactivate
  async deactiveInvestor(
    id: string,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
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

    if (existing.status === InvestorStatus.deactivated) {
      throw new BadRequestException('Investor is already deactivated');
    }

    if (
      existing.status !== InvestorStatus.active &&
      existing.status !== InvestorStatus.suspended
    ) {
      throw new BadRequestException(
        'Only an active or suspended investor can be deactivated',
      );
    }

    // Money still running with the investor blocks deactivation, exactly like
    // suspension — every active investment must be closed first.
    const activeInvestments = await this.prisma.investment.count({
      where: { investorId: id, status: InvestmentStatus.active },
    });

    if (activeInvestments > 0) {
      throw new BadRequestException(
        'Investor cannot be deactivated while they have active investments. Close all active investments first.',
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        let updated: InvestorWithRelations;
        try {
          // Only the status column is written, so deactivation cannot change
          // any other information on the investor.
          updated = await tx.investor.update({
            where: { id, updatedAt: existing.updatedAt },
            data: { status: InvestorStatus.deactivated },
            include: INVESTOR_UPDATE_INCLUDE,
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
          ) {
            throw new ConflictException(
              'Investor was modified by someone else. Reload and try again.',
            );
          }
          throw e;
        }

        await tx.auditLog.create({
          data: {
            adminName: admin?.name ?? 'Admin',
            adminProfileId: admin?.id ?? null,
            action: AuditAction.investor_status_changed,
            module: LogModule.INVESTOR,
            severity: LogSeverity.INFO,
            status: LogStatus.SUCCESS,
            targetLabel: `Investor Deactivated: ${updated.fullname}`,
            targetTable: 'investors',
            targetId: updated.id,
            oldValue: toInvestorSnapshot(existing) as unknown as Prisma.InputJsonValue,
            newValue: toInvestorSnapshot(updated) as unknown as Prisma.InputJsonValue,
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
            sessionId: context?.sessionId ?? null,
          },
        });

        return updated;
      });

      return {
        message: 'Investor has been deactivated successfully',
        success: true,
      };
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

type StagedFields<T extends object> = {
  [K in keyof T]?: NonNullable<T[K]>;
};

//keep fields that have actual values and skip null or undefined.
function stagedFields<T extends object>(fields: T): StagedFields<T> {
  const result: StagedFields<T> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

function toStagedSnapshot(request: ReviewEditRequest) {
  const user = request.editableUser;

  return {
    investor: request.editableInvestor
      ? {
        address: request.editableInvestor.address,
        profession: request.editableInvestor.profession,
        workplace: request.editableInvestor.workplace,
      }
      : null,
    nominee: request.editableNominee
      ? {
        nomineeName: request.editableNominee.nomineeName,
        nomineePhone: request.editableNominee.nomineePhone,
        relation: request.editableNominee.relation,
        nomineeNidFront: request.editableNominee.nomineeNidFront,
        nomineeNidBack: request.editableNominee.nomineeNidBack,
        nomineePhoto: request.editableNominee.nomineePhoto,
      }
      : null,
    kycDocuments: request.editableKycDocument
      ? {
        nidFront: request.editableKycDocument.nidFront,
        nidBack: request.editableKycDocument.nidBack,
        photo: request.editableKycDocument.photo,
      }
      : null,
    user: user
      ? {
        email: user.email,
        phone: user.phone,
        passwordGiven: !!user.passwordHash,
      }
      : null,
  };
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
