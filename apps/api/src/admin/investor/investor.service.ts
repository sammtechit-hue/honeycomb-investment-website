import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  BulkInvestorImportRequest,
  BulkInvestorRowInput,
  BulkInvestorRowIssue,
  BulkInvestorRowResult,
} from '@investment-platform/contracts/investor-bulk-import';
import {
  AuditAction,
  EditRequestStatus,
  InvestmentStatus,
  InvestorStatus,
  LogModule,
  LogSeverity,
  LogStatus,
  Prisma,
  Role,
  VerificationStatus,
} from '@investment-platform/db';
import { PasswordService } from '../../auth/password.service';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAuditContext } from '../../utils/common types';
import { generateUniqueReferralCode } from '../../utils/common/generateReferralCode.utils';
import { fetchData } from '../../utils/common/fetchData.util';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorQueryDto } from './dto/query-investor.dto';
import {
  InvestorEditRequestQueryDto,
  InvestorEditRequestReviewDto,
} from './dto/InvestorEditRequest';
import {
  BankAccountQueryDto,
  UpdateInvestorBankAccountDto,
} from './dto/bankaccount';

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
  private readonly logger = new Logger(InvestorService.name);
  private readonly initialInvestorPassword?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    config: ConfigService<Env, true>,
  ) {
    this.initialInvestorPassword = config.get('INITIAL_PASSWORD_INVESTOR', {
      infer: true,
    });
    if (!this.initialInvestorPassword) {
      this.logger.warn(
        'INITIAL_PASSWORD_INVESTOR is not set — investor bulk import is disabled',
      );
    }
  }

  // ----------------------------------------------------------
  // -------------------------- findAll -----------------------
  // ----------------------------------------------------------
  // GET /api/admin/investor
  async findAllInvestor(query: InvestorQueryDto) {
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

    const [investors, total] = await fetchData(
      this.prisma.investor,
      where,
      orderBy,
      page,
      limit,
      {
        include: {
          user: { select: { email: true, phone: true } },
          nominee: true,
          kycDocuments: true,
          bankAccount: true,
        },
      },
    );

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

  // ----------------------------------------------------------
  // ---------------- findInvestorBankAccounts ----------------
  // ----------------------------------------------------------
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

    const [bankAccounts, total] = await fetchData(
      this.prisma.investorBankAccount,
      where,
      orderBy,
      page,
      limit,
      {
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
      },
    );

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

  // ----------------------------------------------------------
  // ---------------- updateInvestorBankAccount ---------------
  // ----------------------------------------------------------
  // PATCH /api/admin/investor/bank-account/:bankAccountId
  async updateInvestorBankAccount(
    bankAccountId: string,
    dto: UpdateInvestorBankAccountDto,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const fields = {
      selectedBank: dto.selectedBank,
      bankName: dto.bankName,
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
      routingNumber: dto.routingNumber,
      accountType: dto.accountType,
      branchName: dto.branchName,
      isActive: dto.isActive,
    };

    if (Object.values(fields).every((value) => value === undefined)) {
      throw new BadRequestException('No fields provided to update');
    }

    const [existing, admin] = await Promise.all([
      this.prisma.investorBankAccount.findUnique({
        where: { id: bankAccountId },
      }),
      this.prisma.adminProfile.findUnique({
        where: { userId },
        select: { id: true, name: true },
      }),
    ]);

    if (!existing) {
      throw new NotFoundException(
        `Bank account with id ${bankAccountId} not found`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isActive === true) {
        await tx.investorBankAccount.updateMany({
          where: { investorId: existing.investorId, isActive: true, id: { not: bankAccountId } },
          data: { isActive: false },
        });
      }

      const bankAccount = await tx.investorBankAccount.update({
        where: { id: bankAccountId },
        data: fields,
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
      });

      // ----------------------------------------------------------
      // ------------------------- AUDITLOG -----------------------
      // ----------------------------------------------------------

      await tx.auditLog.create({
        data: {
          adminName: admin?.name ?? 'Admin',
          adminProfileId: admin?.id ?? null,
          action: AuditAction.investor_information_updated,
          module: LogModule.INVESTOR,
          severity: LogSeverity.INFO,
          status: LogStatus.SUCCESS,
          targetLabel: `Investor Bank Account Updated: ${bankAccount.accountName}`,
          targetTable: 'investor_bank_accounts',
          targetId: bankAccount.id,
          oldValue: {
            selectedBank: existing.selectedBank,
            bankName: existing.bankName,
            accountName: existing.accountName,
            accountNumber: existing.accountNumber,
            routingNumber: existing.routingNumber,
            accountType: existing.accountType,
            branchName: existing.branchName,
            isActive: existing.isActive,
            investorId: existing.investorId,
          } as unknown as Prisma.InputJsonValue,
          newValue: bankAccount as unknown as Prisma.InputJsonValue,
          metadata: { investorId: existing.investorId } as unknown as Prisma.InputJsonValue,
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
          sessionId: context?.sessionId ?? null,
        },
      });

      return bankAccount;
    });

    return {
      message: 'Investor bank account updated successfully',
      success: true,
      data: updated,
    };
  }

  // ----------------------------------------------------------
  // -------------------------- findOne -----------------------
  // ----------------------------------------------------------
  // GET /api/admin/investor/:id
  async findOneInvestor(id: string) {
    const investor = await this.prisma.investor.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, phone: true, lastLoginAt: true } },
        nominee: true,
        kycDocuments: true,
        bankAccount: { orderBy: [{ isActive: 'desc' }, { id: 'asc' }] },
      },
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

  // ----------------------------------------------------------
  // -------------------- findAllEditRequests -----------------
  // ----------------------------------------------------------
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

    const [editRequests, total] = await fetchData(
      this.prisma.investorEditRequest,
      where,
      orderBy,
      page,
      limit,
      {
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
      },
    );

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

  // ----------------------------------------------------------
  // ----------------- findInvestorEditRequests ---------------
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // ---------------- reviewInvestorEditRequests --------------
  // ----------------------------------------------------------
  // Merge investor Edit Request
  // ----------------------------------------------
  async reviewInvestorEditRequests(
    id: string,
    dto: InvestorEditRequestReviewDto,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {

    // admin
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    // Independent lookups, run in parallel
    const [request, admin] = await Promise.all([
      this.prisma.investorEditRequest.findUnique({
        where: { id },
        include: REVIEW_EDIT_REQUEST_INCLUDE,
      }),
      this.prisma.adminProfile.findUnique({
        where: { userId },
        select: { id: true, name: true },
      }),
    ]);

    if (!request) {
      throw new NotFoundException(
        `Investor edit request with id ${id} not found`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {

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

        // ----------------------------------------------------------
        // ------------------------- AUDITLOG -----------------------
        // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // ---------------------- mergeStagedRows -------------------
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // --------------------------- create Investor --------------
  // ----------------------------------------------------------
  async createInvestor(_dto: CreateInvestorDto) {
    return 'Investor Data';
  }

  // ----------------------------------------------------------
  // ---------------------- createBulkInvestor ----------------
  // ----------------------------------------------------------
  // POST /api/admin/investor/bulk
  async createBulkInvestor(
    dto: BulkInvestorImportRequest,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    if (!this.initialInvestorPassword) {
      throw new ServiceUnavailableException(
        'Investor bulk import is not available right now',
      );
    }

    // Need these for checking existing emails, phones and NID numbers
    const emails = [...new Set(dto.rows.map((row) => row.email))];
    const phones = [...new Set(dto.rows.map((row) => row.phone))];
    const nids = [...new Set(dto.rows.map((row) => row.nidNumber))];

    // Independent lookups, run in parallel
    const [admin, takenUsers, takenNidOwners] = await Promise.all([
      this.prisma.adminProfile.findUnique({
        where: { userId },
        select: { id: true, name: true },
      }),

      // Accounts that already own one of these identifiers are reported as
      // row errors before anything is written.
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { in: emails, mode: 'insensitive' } },
            { phone: { in: phones } },
          ],
        },
        select: { email: true, phone: true },
      }),

      // NID is not unique in the schema, but an import must not stamp a number
      // that already belongs to another investor.
      this.prisma.investor.findMany({
        where: { nidNumber: { in: nids } },
        select: { nidNumber: true },
      }),
    ]);

    const takenEmails = new Set(
      takenUsers.map((user) => user.email.toLowerCase()),
    );
    const takenPhones = new Set(
      takenUsers
        .map((user) => user.phone)
        .filter((phone): phone is string => phone !== null),
    );
    const takenNids = new Set(
      takenNidOwners
        .map((investor) => investor.nidNumber)
        .filter((nid): nid is string => nid !== null),
    );

    // Every imported investor starts on the same initial password
    const passwordHash = await this.passwords.hash(
      this.initialInvestorPassword,
    );

    // ---- Phase 1: validate every row, write nothing ----

    const prepared = dto.rows.map((row) =>
      prepareBulkRow(row, {
        emails: takenEmails,
        phones: takenPhones,
        nids: takenNids,
      }),
    );

    const failedRows = prepared.filter((row) => row.errors.length > 0);

    if (failedRows.length > 0) {
      // The request schema already rejects duplicates inside one file, so
      // every problem below is a database conflict or a malformed row.
      await this.auditRejectedBulkImport(
        prepared,
        failedRows.length,
        userId,
        admin,
        context,
      );

      const results: BulkInvestorRowResult[] = prepared.map((row) =>
        row.errors.length > 0
          ? {
            rowNumber: row.row.rowNumber,
            status: 'failed',
            errors: row.errors,
            // warnings: row.warnings,
          }
          : {
            rowNumber: row.row.rowNumber,
            status: 'skipped',
            errors: [],
            // warnings: [...row.warnings, { message: SKIPPED_ROW_WARNING }],
          },
      );

      throw new UnprocessableEntityException({
        message: 'Investor bulk import rejected: no investors were created',
        success: false,
        data: {
          totals: {
            total: results.length,
            created: 0,
            failed: failedRows.length,
            skipped: results.length - failedRows.length,
          },
          results,
        },
      });
    }

    // ---- Phase 2: create the whole batch in one transaction ----

    // Tracks the row being written so a database error can be attributed to a
    // row number instead of the batch as a whole.
    let currentRow = 0;
    const results: BulkInvestorRowResult[] = [];

    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const row of prepared) {
            currentRow = row.row.rowNumber;
            const investorId = await this.createInvestorInTx(tx, row, {
              passwordHash,
              admin,
              context,
            });

            results.push({
              rowNumber: row.row.rowNumber,
              status: 'created',
              investorId,
              errors: [],
              // warnings: row.warnings,
            });
          }
        },
        // Maximum time the transaction is allowed to run before Prisma cancels it timeout: 30s.
        // Maximum time Prisma waits to acquire a database connection and start the transaction. maxWait: 5s
        { timeout: 20_000, maxWait: 5_000 },
      );
    } catch (err) {
      // P2002 here means another account took the email, phone or NID after
      // phase 1 checked it. The transaction has rolled back, so nothing is
      // saved — report which row lost the race.
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            `Row ${currentRow}: ${uniqueTargetLabel(err.meta?.target)} is already in use by another account.`,
          );
        }
        if (err.code === 'P2000') {
          throw new BadRequestException(
            `Row ${currentRow}: one of the provided values is too long for its field.`,
          );
        }
        if (err.code === 'P2003') {
          throw new BadRequestException(
            `Row ${currentRow}: one or more referenced records do not exist.`,
          );
        }
      }

      // Anything else (database down, bug) is not a row-level problem — fail
      // the request so it is not silently reported as a bad CSV row.
      throw err;
    }

    return {
      message: 'Investor bulk import completed',
      success: true,
      data: {
        totals: {
          total: results.length,
          created: results.length,
        },
        results,
      },
    };
  }

  // ----------------------------------------------------------
  // -------------------- createInvestorInTx ------------------
  // ----------------------------------------------------------
  // Writes one prepared row: user, investor (with nested bank account, nominee
  // and KYC documents) and its audit log. Called from the batch transaction, so
  // all of it rolls back together if any row fails.
  private async createInvestorInTx(
    tx: Prisma.TransactionClient,
    prepared: PreparedBulkRow,
    batch: BulkImportBatch,
  ): Promise<string> {
    const { row } = prepared;

    // The row schema validates each group as all-or-nothing, so the nested
    // payloads are built only when the whole group is present.
    const bankAccount =
      row.selectedBank !== undefined &&
        row.bankName !== undefined &&
        row.accountName !== undefined &&
        row.accountNumber !== undefined
        ? {
          selectedBank: row.selectedBank,
          bankName: row.bankName,
          accountName: row.accountName,
          accountNumber: row.accountNumber,
          routingNumber: row.routingNumber,
          accountType: row.accountType,
          branchName: row.branchName,
          // Same as investor self-registration: an admin reviews and
          // activates the account before any payout uses it.
          isActive: true,
        }
        : undefined;

    const nominee =
      row.nomineeName !== undefined &&
        row.nomineePhone !== undefined &&
        row.relation !== undefined
        ? {
          nomineeName: row.nomineeName,
          nomineePhone: row.nomineePhone,
          relation: row.relation,
          nomineeNidNumber: row.nomineeNidNumber,
        }
        : undefined;

    // KYC documents are required on every bulk row.
    const kycDocuments = {
      nidFront: row.nidFront,
      nidBack: row.nidBack,
      photo: row.photo,
      verificationStatus: VerificationStatus.verified
    };

    let password = "";

    if (row.password) {
      password = await this.passwords.hash(
        row.password
      );
    } else {
      password = batch.passwordHash;
    }


    const user = await tx.user.create({
      data: {
        email: row.email,
        phone: row.phone,
        passwordHash: password,
        role: Role.INVESTOR,
      },
      select: { id: true },
    });

    const created = await tx.investor.create({
      data: {
        fullname: row.fullname,
        address: row.address,
        profession: row.profession,
        workplace: row.workplace,
        nidNumber: row.nidNumber,
        category: row.category,
        // Imported profiles start where signup leaves them: pending KYC.
        status: InvestorStatus.active,
        user: { connect: { id: user.id } },
        ...(bankAccount && { bankAccount: { create: [bankAccount] } }),
        ...(nominee && { nominee: { create: nominee } }),
        kycDocuments: { create: kycDocuments },
      },
      select: { id: true, fullname: true },
    });

    // ----------------------------------------------------------
    // ------------------------- AUDITLOG -----------------------
    // ----------------------------------------------------------
    await tx.auditLog.create({
      data: {
        adminName: batch.admin?.name ?? 'Admin',
        adminProfileId: batch.admin?.id ?? null,
        action: AuditAction.investor_bulk_imported,
        module: LogModule.INVESTOR,
        severity: LogSeverity.INFO,
        status: LogStatus.SUCCESS,
        targetLabel: `Investor Imported: ${created.fullname}`,
        targetTable: 'investors',
        targetId: created.id,
        newValue: {
          fullName: row.fullname,
          email: row.email,
          phone: row.phone,
          nidNumber: row.nidNumber ?? null,
          category: row.category,
          status: InvestorStatus.pending,
          bankAccount: Boolean(bankAccount),
          nominee: Boolean(nominee),
          kycDocuments: true,
        } as unknown as Prisma.InputJsonValue,
        metadata: {
          source: 'bulk_import',
          rowNumber: row.rowNumber,
        } as unknown as Prisma.InputJsonValue,
        ipAddress: batch.context?.ipAddress ?? null,
        userAgent: batch.context?.userAgent ?? null,
        sessionId: batch.context?.sessionId ?? null,
      },
    });

    return created.id;
  }

  // ----------------------------------------------------------
  // ------------------ auditRejectedBulkImport ---------------
  // ----------------------------------------------------------
  // Written outside any transaction: a rejected import created no investor row,
  // but the attempt must still leave a trail.
  private async auditRejectedBulkImport(
    prepared: PreparedBulkRow[],
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
          action: AuditAction.investor_bulk_import_rejected,
          module: LogModule.INVESTOR,
          severity: LogSeverity.WARNING,
          status: LogStatus.FAILED,
          targetLabel: `Bulk import rejected: ${failedCount} of ${prepared.length} rows invalid`,
          // No investor row was created, so the acting admin's user row is what
          // the trail points at.
          targetTable: 'users',
          targetId: userId,
          metadata: {
            source: 'bulk_import',
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
        'Failed to write bulk import rejected audit log',
        err as Error,
      );
    }
  }

  // ----------------------------------------------------------
  // ---------------------- updateInvestor --------------------
  // ----------------------------------------------------------
  // PATCH /api/admin/investor/:id
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
      nidNumber,
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
        nidNumber,
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
      nidNumber !== undefined ||
      category !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      nominee !== undefined ||
      kycDocuments !== undefined;

    // Rejection needs a reason the investor sees — PATCH :id/reject.
    if (status === InvestorStatus.rejected) {
      throw new BadRequestException(
        'Use the reject action to send an application back with a reason.',
      );
    }

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

    // A rejected application belongs to the investor until they resubmit it.
    if (existing.status === InvestorStatus.rejected) {
      throw new BadRequestException(
        'This application was sent back to the investor. It can be reviewed again once they resubmit it.',
      );
    }

    // An active investor can't revert to an earlier onboarding stage — the
    // only permitted status change from active is suspension.
    if (
      existing.status === InvestorStatus.active &&
      (status === InvestorStatus.pending)
    ) {
      throw new BadRequestException(
        'An active investor cannot go back to pending. The only permitted status change is suspension.',
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

    // Investors never type NID numbers; the admin copies them from the NID
    // images during review. The contract prints both, so approval waits for
    // them — they may come in this same request.
    if (becomingActive) {
      const missing = [
        !(nidNumber ?? existing.nidNumber) && "the investor's NID number",
        !(nominee?.nomineeNidNumber ?? existing.nominee?.nomineeNidNumber) &&
        "the nominee's NID number",
      ].filter(Boolean);
      if (missing.length) {
        throw new BadRequestException(
          `Enter ${missing.join(' and ')} before approving this investor.`,
        );
      }
    }

    const investorData: Prisma.InvestorUpdateInput = {
      fullname: fullName,
      address,
      profession,
      workplace,
      nidNumber,
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

        if (becomingActive) {
          await this.ensureReferralCode(tx, id);
        }

        // ----------------------------------------------------------
        // ------------------------- AUDITLOG -----------------------
        // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // --------------------- deactiveInvestor -------------------
  // ----------------------------------------------------------
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

        // ----------------------------------------------------------
        // ------------------------- AUDITLOG -----------------------
        // ----------------------------------------------------------
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

  // PATCH /api/admin/investor/:id/reject
  // Sends an application under review back to the investor with a reason.
  // They can then edit everything (profile, documents, bank, first
  // investment) and resubmit; nothing else may change it meanwhile.
  async rejectApplication(
    id: string,
    reason: string,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

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
    if (existing.status === InvestorStatus.rejected) {
      throw new BadRequestException(
        'This application was already sent back and is waiting for the investor.',
      );
    }
    if (
      existing.status !== InvestorStatus.pending &&
      existing.status !== InvestorStatus.uploaded_kyc
    ) {
      throw new BadRequestException(
        'Only an application under review can be rejected.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      let updated: InvestorWithRelations;
      try {
        updated = await tx.investor.update({
          where: { id, updatedAt: existing.updatedAt },
          data: {
            status: InvestorStatus.rejected,
            rejectionReason: reason,
            rejectedAt: new Date(),
            ...(existing.kycDocuments && {
              kycDocuments: { update: { verificationStatus: 'rejected' } },
            }),
          },
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
          targetLabel: `Application Rejected: ${updated.fullname}`,
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

    return {
      message: 'Application sent back to the investor',
      success: true,
    };
  }

  // ----------------------------------------------------------
  // --------------------- ensureReferralCode -----------------
  // ----------------------------------------------------------
  // Approval is when the investor becomes eligible to refer others. An existing
  // unused, active code is reused; otherwise a fresh one is issued.
  private async ensureReferralCode(
    tx: Prisma.TransactionClient,
    investorId: string,
  ) {

    //first find existing referralCode
    const reusable = await tx.referralCode.findFirst({
      where: { referrerId: investorId, isUsed: false, isActive: true },
      select: { id: true },
    });

    if (reusable) return;

    // await tx.referralCode.create({
    //   data: {
    //     code: await generateUniqueReferralCode(tx),  //modular function in utils
    //     referrerId: investorId,
    //   },
    // });

    const newReferralCode = await tx.referralCode.create({
      data: {
        code: await generateUniqueReferralCode(tx),
        referrerId: investorId,
      },
      select: {
        id: true,
      },
    });

    // Deactivate previous active referral codes
    await tx.referralCode.updateMany({
      where: {
        referrerId: investorId,
        isActive: true,
        id: { not: newReferralCode.id },
      },
      data: {
        isActive: false,
      },
    });

  }

  // ----------------------------------------------------------
  // ---------------------- nomineeNestedWrite ---------------
  // ----------------------------------------------------------
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
          nomineeNidNumber: nominee.nomineeNidNumber,
          nomineeNidFront: nominee.nomineeNidFront,
          nomineeNidBack: nominee.nomineeNidBack,
          nomineePhoto: nominee.nomineePhoto,
        },
      },
    };
  }

  // ----------------------------------------------------------
  // ------------------------ kycNestedWrite ------------------
  // ----------------------------------------------------------
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

// ----------------------------------------------------------
// ------------------------ batch types ---------------------
// ----------------------------------------------------------
// One validated but not yet written bulk import row, plus the row-level
// findings reported back to the admin.
type PreparedBulkRow = {
  row: BulkInvestorRowInput;
  errors: BulkInvestorRowIssue[];
  // warnings: BulkInvestorRowIssue[];
};

type BulkImportBatch = {
  passwordHash: string;
  admin: { id: string; name: string | null } | null;
  context?: RequestAuditContext;
};

// Shown on rows that are valid but not imported because another row failed.
// const SKIPPED_ROW_WARNING =
//   'Row is valid but was not imported because other rows failed.';

// ----------------------------------------------------------
// ----------------------- prepareBulkRow -------------------
// ----------------------------------------------------------
// Phase 1 of the bulk import: collect every problem with a row without writing
// anything, so the admin sees all bad rows in one response.
function prepareBulkRow(
  row: BulkInvestorRowInput,
  taken: { emails: Set<string>; phones: Set<string>; nids: Set<string> },
): PreparedBulkRow {
  const errors: BulkInvestorRowIssue[] = [];
  // const warnings: BulkInvestorRowIssue[] = [];

  if (taken.emails.has(row.email)) {
    errors.push({
      field: 'email',
      message: `An account with email "${row.email}" already exists`,
    });
  }

  if (taken.phones.has(row.phone)) {
    errors.push({
      field: 'phone',
      message: `An account with phone "${row.phone}" already exists`,
    });
  }

  if (row.nidNumber !== undefined && taken.nids.has(row.nidNumber)) {
    errors.push({
      field: 'nidNumber',
      message: `An investor with NID number "${row.nidNumber}" already exists`,
    });
  }

  // const bankAccount = bulkRowBankAccount(row, errors);
  // const nominee = bulkRowNominee(row);


  // if (
  //   row.selectedBank !== undefined &&
  //   row.bankName !== undefined &&
  //   row.accountName !== undefined &&
  //   row.accountNumber !== undefined
  // ) {
  //   warnings.push({
  //     message:
  //       'Bank account is created inactive; activate it from the investor bank-account endpoint.',
  //   });
  // }

  // return { row, errors, warnings };
  return { row, errors };
}

// ----------------------------------------------------------
// --------------------- uniqueTargetLabel ------------------
// ----------------------------------------------------------
// Prisma reports the violated columns in `meta.target`. Naming them keeps a
// race error from claiming "email or phone" when the NID was the duplicate.
const UNIQUE_TARGET_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  nid_number: 'NID number',
};

function uniqueTargetLabel(target: unknown): string {
  const fields = Array.isArray(target)
    ? target.filter((field): field is string => typeof field === 'string')
    : typeof target === 'string'
      ? [target]
      : [];

  if (fields.length === 0) return 'One of the provided unique values';

  return fields
    .map((field) => UNIQUE_TARGET_LABELS[field] ?? field)
    .join(', ');
}

// ----------------------------------------------------------
// ------------------------- pickLogModule ------------------
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// ----------------------- pickAuditAction ------------------
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// ------------------------- stagedFields -------------------
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// ---------------------- toStagedSnapshot ------------------
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// --------------------- toInvestorSnapshot -----------------
// ----------------------------------------------------------
function toInvestorSnapshot(investor: InvestorWithRelations) {
  return {
    fullName: investor.fullname,
    address: investor.address,
    profession: investor.profession,
    workplace: investor.workplace,
    nidNumber: investor.nidNumber,
    category: investor.category,
    status: investor.status,
    totalInvestmentAmount: Number(investor.totalInvestmentAmount),
    approvedAt: investor.approvedAt?.toISOString() ?? null,
    approvedBy: investor.approvedBy,
    rejectionReason: investor.rejectionReason,
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
