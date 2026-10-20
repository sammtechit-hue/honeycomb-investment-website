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
  status: true,      //pending etc
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
  constructor(private readonly prisma: PrismaService) { }

  // Only has Access to his own investor profile
  private async findOwnerUserId(
    investorId: string,
    user: AuthenticatedUser,
  ): Promise<string | null> {
    const investor = await this.prisma.investor.findUnique({
      where: { id: investorId },
      select: { userId: true },
    });
    const ownerUserId = investor?.userId ?? null;

    if (user.role === Role.SUPER_ADMIN) return ownerUserId;

    if (ownerUserId === null || ownerUserId !== user.userId) {
      throw new ForbiddenException(
        'investor profile Invalid.',
      );
    }

    return ownerUserId;
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.findOwnerUserId(id, user);

    const investor = await this.prisma.investor.findUnique({
      where: { id },
      select: INVESTOR_PROFILE_SELECT,
    });

    if (!investor) {
      throw new NotFoundException(`Investor with ID "${id}" not found`);
    }

    // const { fullname, user, ...profile } = investor;
    // return {
    //   ...profile,
    //   fullName: fullname,
    //   email: user.email,
    //   phone: user.phone,
    // };

    // Don't expose category until investor is beyond the initial KYC stages
    if (investor.status === 'pending' || investor.status === 'uploaded_kyc') {
      const { category, ...profile } = investor;

      return profile;
    }

    return investor;
  }

  async createInvestor(dto: CreateInvestorDto, userId: string | undefined, context?: RequestAuditContext) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const referralCode = dto.referralCode?.trim() || undefined;

    const [user, existingInvestor, referralCodeRecord] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.investor.findUnique({ where: { userId } }),
      // Process referral code if provided
      referralCode ? this.prisma.referralCode.findUnique({ where: { code: referralCode } }) : Promise.resolve(null),
    ]);

    // Verify User exists
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    if (existingInvestor) {
      throw new ConflictException('An Investor profile already exists for this user account.');
    }

    // If referralCode is given
    if (referralCode) {
      if (!referralCodeRecord) {
        throw new BadRequestException('The provided referral code is invalid');
      }
      if (referralCodeRecord.expiresAt && referralCodeRecord.expiresAt < new Date()) {
        throw new BadRequestException('This referral code has expired');
      }
      if (referralCodeRecord.isUsed) {
        throw new BadRequestException('This referral code has already been used');
      }
    }

    // Check that kyc file are given and set status kyc_uploaded if not, set status pending.
    const kycInput = dto.kycDocuments
    const hasKycDocuments =
      !!kycInput?.nidFront &&
      !!kycInput?.nidBack &&
      !!kycInput?.photo;

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
        })

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
            throw new ConflictException('This referral code was just used by someone else. Please retry.');
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
          })
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
      })
    } catch (err) {
      // instead of a raw Prisma error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An Investor profile already exists for this user account.');
      }
      // VARCHAR). Surface as 400 with an actionable message instead of 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2000') {
        throw new BadRequestException('One of the provided values is too long for its field.');
      }
      throw err;
    }
  }

  async updateInvestor(id: string, dto: UpdateInvestorDto, user: AuthenticatedUser) {
    await this.findOwnerUserId(id, user);

    const investor = await this.prisma.investor.findUnique({
      where: { id },
      select: {
        id: true,
        fullname: true,
        userId: true,
        user: { select: { email: true, phone: true, passwordHash: true } },
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

    // Find a matching user whose ID is not the current investor's user ID.
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
      if (clash) throw new ConflictException('Email or phone is already in use');
    }

     const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : undefined;

    // Check for password if dto.password and current password same
    if (dto.password) {
      const isSame = await bcrypt.compare(dto.password, investor.user.passwordHash)
      if (isSame) {
        throw new BadRequestException('New password must be different from the current password');
      }
    }
    
    let stagedChanges: {
      editableInvestor?: Prisma.EditableInvestorGetPayload<{}>;
      editableNominee?: Prisma.EditableNomineeGetPayload<{}>;
      editableInvestorKycDocuments?: Prisma.EditableInvestorKycDocumentsGetPayload<{}>;
      editableUser?: Prisma.EditableUserGetPayload<{}>;
    };

    try {
      stagedChanges = await this.prisma.$transaction(async (tx) => {
        const changes: typeof stagedChanges = {};

        if (profileChanges) {
          changes.editableInvestor = await tx.editableInvestor.create({
            data: {
              address: dto.address,
              profession: dto.profession,
              workplace: dto.workplace,
              investorId: investor.id
            }
          })
        }

        if (nomineeChanges) {
          changes.editableNominee = await tx.editableNominee.create({
            data: {
              nomineeName: dto.nominee?.nomineeName,
              nomineeNidFront: dto.nominee?.nomineeNidFront,
              nomineeNidBack: dto.nominee?.nomineeNidBack,
              nomineePhoto: dto.nominee?.nomineePhoto,
              nomineePhone: dto.nominee?.nomineePhone,
              relation: dto.nominee?.relation,
              investorId: investor.id,
            }
          })
        }

        if (kycChanges) {
          changes.editableInvestorKycDocuments = await tx.editableInvestorKycDocuments.create({
            data: {
              nidFront: dto.kycDocuments?.nidFront,
              nidBack: dto.kycDocuments?.nidBack,
              photo: dto.kycDocuments?.photo,
              investorId: investor.id,
            }
          })
        }

        if (userChanges) {
          changes.editableUser = await tx.editableUser.create({
            data: {
              email: dto.email,
              phone: dto.phone,
              passwordHash: passwordHash,
              investorId: investor.id,
            }
          })
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
            message: `${investor.fullname} submitted ${changedSections} changes and is waiting for your review.`,
            isRead: false,
            clickLink: `/admin/investors/${investor.id}`,
          },
        });

        return changes;
      })
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
      message: 'Profile changes submitted for review',
      success: true,
      data: stagedChanges,
    };
  }
}
