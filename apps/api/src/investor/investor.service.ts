import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  AdminNotificationType,
  EditRequestStatus,
  InvestorStatus,
  Role,
} from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { RequestAuditContext } from '../utils/common types';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../auth/auth.constants';

// Selected Field for investor can see
const INVESTOR_PROFILE_SELECT = {
  id: true,
  fullname: true,
  address: true,
  profession: true,
  workplace: true,
  category: true,
  status: true, //pending etc
  totalInvestmentAmount: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  // Contact details live on the 1:1 User; the profile form edits `email`.
  user: {
    select: {
      email: true,
      phone: true,
      lastLoginAt: true,
    },
  },
  // KYC review state — the investor watches this go pending -> verified.
  kycDocuments: {
    select: {
      id: true,
      nidFront: true,
      nidBack: true,
      photo: true,
      verificationStatus: true,
      uploadedAt: true,
    },
  },
  // Payout account(s); `isActive` marks the one that receives disbursements.
  bankAccount: {
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
    },
  },
  nominee: {
    select: {
      id: true,
      nomineeName: true,
      nomineeNidFront: true,
      nomineeNidBack: true,
      nomineePhoto: true,
      nomineePhone: true,
      relation: true,
    },
  },
} satisfies Prisma.InvestorSelect;

@Injectable()
export class InvestorService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(user: AuthenticatedUser) {
    // fetech existing investor data using auth userid as given in function param
    const investor = await this.prisma.investor.findUnique({
      where: { userId: user.userId },
      select: { ...INVESTOR_PROFILE_SELECT, userId: true },
    });

    if (!investor) {
      throw new NotFoundException(`No investor profile found for the user`);
    }

    // `userId` was fetched for the ownership check; don't return it.
    const { userId: _ownerUserId, ...profile } = investor;

    // Don't expose category until investor is beyond the initial KYC stages
    if (profile.status === 'pending' || profile.status === 'uploaded_kyc') {
      const { category, ...publicProfile } = profile;

      return publicProfile;
    }

    return profile;
  }

  async createInvestor(
    dto: CreateInvestorDto,
    userId: string | undefined,
    context?: RequestAuditContext,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const referralCode = dto.referralCode?.trim() || undefined;

    const [user, existingInvestor, referralCodeRecord] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.investor.findUnique({ where: { userId } }),
      // Process referral code if provided
      referralCode
        ? this.prisma.referralCode.findUnique({ where: { code: referralCode } })
        : Promise.resolve(null),
    ]);

    // Verify User exists
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    if (existingInvestor) {
      throw new ConflictException(
        'An Investor profile already exists for this user account.',
      );
    }

    // If referralCode is given
    if (referralCode) {
      if (!referralCodeRecord) {
        throw new BadRequestException('The provided referral code is invalid');
      }
      if (
        referralCodeRecord.expiresAt &&
        referralCodeRecord.expiresAt < new Date()
      ) {
        throw new BadRequestException('This referral code has expired');
      }
      if (referralCodeRecord.isUsed) {
        throw new BadRequestException(
          'This referral code has already been used',
        );
      }
    }

    // Check that kyc file are given and set status kyc_uploaded if not, set status pending.
    const kycInput = dto.kycDocuments;
    const hasKycDocuments =
      !!kycInput?.nidFront && !!kycInput?.nidBack && !!kycInput?.photo;

    const investorStatus: InvestorStatus = hasKycDocuments
      ? 'uploaded_kyc'
      : 'pending';

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create Investor profile & relations
        const investor = await tx.investor.create({
          data: {
            fullname: dto.fullName,
            address: dto.address,
            profession: dto.profession,
            workplace: dto.workplace,
            status: investorStatus,
            category: 'bronze',
            user: {
              connect: { id: userId },
            },
            bankAccount: {
              create: [
                {
                  selectedBank: dto.bankAccount.selectedBank,
                  bankName: dto.bankAccount.bankName,
                  accountName: dto.bankAccount.accountName,
                  accountNumber: dto.bankAccount.accountNumber,
                  routingNumber: dto.bankAccount.routingNumber,
                  accountType: dto.bankAccount.accountType,
                  branchName: dto.bankAccount.branchName,
                  isActive: false,
                },
              ],
            },
            nominee: {
              create: {
                nomineeName: dto.nominee.nomineeName,
                nomineeNidFront: dto.nominee.nomineeNidFront,
                nomineeNidBack: dto.nominee.nomineeNidBack,
                nomineePhoto: dto.nominee.nomineePhoto,
                nomineePhone: dto.nominee.nomineePhone,
                relation: dto.nominee.relation,
              },
            },
            kycDocuments: hasKycDocuments
              ? {
                  create: {
                    nidFront: kycInput?.nidFront,
                    nidBack: kycInput?.nidBack,
                    photo: kycInput?.photo,
                    verificationStatus: 'pending',
                  },
                }
              : undefined,
          },
          include: {
            bankAccount: true,
            nominee: true,
            kycDocuments: true,
          },
        });

        // Connect and initialize Referral relations if valid referral code used
        if (referralCodeRecord) {
          // Imagine two users submit the same referral code at almost exactly the same time.
          // But then:

          // User A → updateMany → count = 1 → succeeds
          // User B → updateMany → count = 0 → fails

          // That's exactly the kind of race condition you want to protect against.
          // Conditional update closes the race: only succeeds if still unused.
          const { count } = await tx.referralCode.updateMany({
            where: { id: referralCodeRecord.id, isUsed: false },
            data: {
              isUsed: true,
              usedAt: new Date(),
              referredId: investor.id,
            },
          });

          if (count === 0) {
            throw new ConflictException(
              'This referral code was just used by someone else. Please retry.',
            );
          }

          // Record the formal relationship trace
          await tx.referral.create({
            data: {
              referrerId: referralCodeRecord.referrerId,
              referredInvestorId: investor.id,
              referralCodeId: referralCodeRecord.id,
              bonusPercent: new Prisma.Decimal(1.0), // Standard 1.00% bonus
              // bonus amount will added later by admin
            },
          });
        }

        // Notification
        await tx.adminNotification.create({
          data: {
            type: 'new_investment_request' as AdminNotificationType,
            referenceId: investor.id,
            message: `New profile registration: ${investor.fullname} (Status: ${investor.status})${hasKycDocuments ? ' has uploaded KYC documents and is waiting for your manual review.' : ' registered without KYC documents.'}`,
            isRead: false,
            clickLink: `/admin/investors/${investor.id}`,
          },
        });

        return {
          message: 'Investor Registration successful',
          success: true,
        };
      });
    } catch (err) {
      // instead of a raw Prisma error.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'An Investor profile already exists for this user account.',
        );
      }
      // VARCHAR). Surface as 400 with an actionable message instead of 500.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2000'
      ) {
        throw new BadRequestException(
          'One of the provided values is too long for its field.',
        );
      }
      throw err;
    }
  }

  async updateInvestor(dto: UpdateInvestorDto, user: AuthenticatedUser) {
    // fetech existing investor data using auth userid as given in function param
    const investor = await this.prisma.investor.findUnique({
      where: { userId: user.userId },
      select: {
        id: true,
        fullname: true,
        userId: true,
        user: { select: { passwordHash: true } },
      },
    });

    if (!investor) {
      throw new NotFoundException(`Invalid Investor!`);
    }

    const profileChanges = !!dto.address || !!dto.profession || !!dto.workplace;
    const nomineeChanges = !!dto.nominee;
    const kycChanges = !!dto.kycDocuments;
    const userChanges = !!dto.email || !!dto.phone || !!dto.password;

    if (!profileChanges && !nomineeChanges && !kycChanges && !userChanges) {
      throw new BadRequestException('No changes detected');
    }

    if (userChanges) {
      const clash = await this.prisma.user.findFirst({
        where: {
          id: { not: investor.userId }, // Find a matching user whose ID is not the current investor's user ID.
          OR: [
            ...(dto.email ? [{ email: dto.email }] : []),
            ...(dto.phone ? [{ phone: dto.phone }] : []),
          ],
        },
        select: { id: true },
      });
      if (clash)
        throw new ConflictException('Email or phone is already in use');
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : undefined;

    // Check for password if dto.password and current password same
    // if (dto.password) {
    //   const isSame = await bcrypt.compare(dto.password, investor.user.passwordHash)
    //   if (isSame) {
    //     throw new BadRequestException('New password must be different from the current password');
    //   }
    // }

    let stagedChanges: {
      editableInvestor?: Prisma.EditableInvestorGetPayload<{}>;
      editableNominee?: Prisma.EditableNomineeGetPayload<{}>;
      editableInvestorKycDocuments?: Prisma.EditableInvestorKycDocumentsGetPayload<{}>;
      editableUser?: Prisma.EditableUserGetPayload<{}>;
    };

    // Sections whose staged rows got overwritten instead of newly created.
    let overwrittenSections: string[] = [];

    try {
      ({ changes: stagedChanges, overwritten: overwrittenSections } =
        await this.prisma.$transaction(async (tx) => {
          const changes: typeof stagedChanges = {};
          const overwritten: string[] = [];
          // Pending requests whose staged rows get re-pointed to the new
          // request and therefore empty out (see the cleanup below).
          const orphanedRequestIds: string[] = [];

          // Each submission creates one InvestorEditRequest (status defaults to
          // PENDING); the staged Editable* rows below link to it via editRequestId.
          const editRequest = await tx.investorEditRequest.create({
            data: {
              investorId: investor.id,
            },
          });

          if (profileChanges) {
            // A staged row not yet applied by staff (isActivated false) gets
            // overwritten instead of stacking a new row; fields this request
            // omits keep their previously staged values.
            const pending = await tx.editableInvestor.findFirst({
              where: {
                editRequest: { investorId: investor.id },
                isActivated: false,
              },
              orderBy: { createdAt: 'desc' as const },
            });

            changes.editableInvestor = pending
              ? await tx.editableInvestor.update({
                  where: { id: pending.id },
                  data: {
                    address: dto.address ?? pending.address,
                    profession: dto.profession ?? pending.profession,
                    workplace: dto.workplace ?? pending.workplace,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                })
              : await tx.editableInvestor.create({
                  data: {
                    address: dto.address,
                    profession: dto.profession,
                    workplace: dto.workplace,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                });

            if (pending) {
              overwritten.push('profile');
              orphanedRequestIds.push(pending.editRequestId);
            }
          }

          if (nomineeChanges) {
            const pending = await tx.editableNominee.findFirst({
              where: {
                editRequest: { investorId: investor.id },
                isActivated: false,
              },
              orderBy: { createdAt: 'desc' as const },
            });

            changes.editableNominee = pending
              ? await tx.editableNominee.update({
                  where: { id: pending.id },
                  data: {
                    nomineeName:
                      dto.nominee?.nomineeName ?? pending.nomineeName,
                    nomineeNidFront:
                      dto.nominee?.nomineeNidFront ?? pending.nomineeNidFront,
                    nomineeNidBack:
                      dto.nominee?.nomineeNidBack ?? pending.nomineeNidBack,
                    nomineePhoto:
                      dto.nominee?.nomineePhoto ?? pending.nomineePhoto,
                    nomineePhone:
                      dto.nominee?.nomineePhone ?? pending.nomineePhone,
                    relation: dto.nominee?.relation ?? pending.relation,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                })
              : await tx.editableNominee.create({
                  data: {
                    nomineeName: dto.nominee?.nomineeName,
                    nomineeNidFront: dto.nominee?.nomineeNidFront,
                    nomineeNidBack: dto.nominee?.nomineeNidBack,
                    nomineePhoto: dto.nominee?.nomineePhoto,
                    nomineePhone: dto.nominee?.nomineePhone,
                    relation: dto.nominee?.relation,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                });

            if (pending) {
              overwritten.push('nominee');
              orphanedRequestIds.push(pending.editRequestId);
            }
          }

          if (kycChanges) {
            const pending = await tx.editableInvestorKycDocuments.findFirst({
              where: {
                editRequest: { investorId: investor.id },
                isActivated: false,
              },
              orderBy: { createdAt: 'desc' as const },
            });

            changes.editableInvestorKycDocuments = pending
              ? await tx.editableInvestorKycDocuments.update({
                  where: { id: pending.id },
                  data: {
                    nidFront: dto.kycDocuments?.nidFront ?? pending.nidFront,
                    nidBack: dto.kycDocuments?.nidBack ?? pending.nidBack,
                    photo: dto.kycDocuments?.photo ?? pending.photo,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                })
              : await tx.editableInvestorKycDocuments.create({
                  data: {
                    nidFront: dto.kycDocuments?.nidFront,
                    nidBack: dto.kycDocuments?.nidBack,
                    photo: dto.kycDocuments?.photo,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                });

            if (pending) {
              overwritten.push('KYC documents');
              orphanedRequestIds.push(pending.editRequestId);
            }
          }

          if (userChanges) {
            const pending = await tx.editableUser.findFirst({
              where: {
                editRequest: { investorId: investor.id },
                isActivated: false,
              },
              orderBy: { createdAt: 'desc' as const },
            });

            changes.editableUser = pending
              ? await tx.editableUser.update({
                  where: { id: pending.id },
                  data: {
                    email: dto.email ?? pending.email,
                    phone: dto.phone ?? pending.phone,
                    // A previously staged password is kept when this request
                    // doesn't change it.
                    passwordHash: passwordHash ?? pending.passwordHash,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                })
              : await tx.editableUser.create({
                  data: {
                    email: dto.email,
                    phone: dto.phone,
                    passwordHash: passwordHash,
                    editRequest: { connect: { id: editRequest.id } },
                  },
                });

            if (pending) {
              overwritten.push('contact details');
              orphanedRequestIds.push(pending.editRequestId);
            }
          }

          // An overwritten staged row is re-pointed (unique editRequestId)
          // to this new request, which can leave the previous pending
          // request without a single editable row. Such an emptied request
          // would otherwise linger in the admin list with every pendingEdits
          // field null — remove it. Requests that still hold another
          // section's staged row (a multi-section submission only part of
          // which was overwritten) stay pending, and APPROVED/REJECTED
          // history is never touched.
          if (orphanedRequestIds.length) {
            await tx.investorEditRequest.deleteMany({
              where: {
                id: { in: Array.from(new Set(orphanedRequestIds)) },
                status: EditRequestStatus.PENDING,
                editableInvestor: null,
                editableNominee: null,
                editableKycDocument: null,
                editableUser: null,
              },
            });
          }

          const changedSections = [
            profileChanges && 'profile',
            nomineeChanges && 'nominee',
            kycChanges && 'KYC documents',
            userChanges && 'contact details',
          ]
            .filter(Boolean) //removes falsy values
            .join(', ');

          // Admin review queue: the live records aren't touched until staff
          // apply the staged Editable* rows.
          await tx.adminNotification.create({
            data: {
              type: 'investor_action' as AdminNotificationType,
              referenceId: investor.id,
              message: `${investor.fullname} submitted ${changedSections} changes and is waiting for your review.${
                overwritten.length
                  ? ` Their earlier pending ${overwritten.join(', ')} edits were overwritten by this submission.`
                  : ''
              }`,
              isRead: false,
              clickLink: `/admin/investors/${investor.id}`,
            },
          });

          return { changes, overwritten };
        }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2000') {
          throw new BadRequestException(
            'One of the provided values is too long for its field.',
          );
        }
      }
      throw err;
    }

    return {
      message: overwrittenSections.length
      
        ? 'Your earlier pending changes were overwritten and resubmitted for review'
        : 'Profile changes submitted for review',
      success: true,
      data: stagedChanges,
    };
  }
}
