import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, LogModule, LogSeverity, LogStatus, AdminNotificationType } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { RequestAuditContext } from '../utils/common types';

@Injectable()
export class InvestorService {
  constructor(private readonly prisma: PrismaService) { }

  // -----------------------------------------------------------------------
  // findOwnerUserId — User.id that owns this investor profile, or null if
  // the profile doesn't exist. Used by the controller's ownership check;
  // kept separate from findOne so that check never depends on what
  // findOne's response shape happens to include.
  // -----------------------------------------------------------------------
  async findOwnerUserId(id: string): Promise<string | null> {
    const investor = await this.prisma.investor.findUnique({
      where: { id },
      select: { userId: true },
    });
    return investor?.userId ?? null;
  }

  // -----------------------------------------------------------------------
  // findOne — single investor with full related data
  // -----------------------------------------------------------------------
  async findOne(id: string) {
    return "Investor Data";
  }

  // -----------------------------------------------------------------------
  // Create service function 
  // -----------------------------------------------------------------------
  async create(dto: CreateInvestorDto, userId: string | undefined, context?: RequestAuditContext) {
    // Verify User exists
    const [user, existingInvestor, referralCodeRecord] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.investor.findUnique({ where: { userId } }),
      // Process referral code if provided
      dto.referralCode ? this.prisma.referralCode.findUnique({ where: { code: dto.referralCode } }) : Promise.resolve(null),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    if (existingInvestor) {
      throw new ConflictException('An Investor profile already exists for this user account.');
    }
    if (dto.referralCode) {
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
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create Investor profile & relations
        const investor = await tx.investor.create({
          data: {
            fullname: dto.fullName,
            address: dto.address,
            profession: dto.profession,
            workplace: dto.workplace,
            status: 'pending',
            catagory: 'bronze',
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
            kycDocuments: {
              create: {
                nidFront: dto.kycDocuments.nidFront,
                nidBack: dto.kycDocuments.nidBack,
                photo: dto.kycDocuments.photo,
                verificationStatus: 'pending',
              },
            },
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
              useAt: new Date(),
              referradId: investor.id,
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

        // System Audit Logs using the updated Schema format
        // const auditPayload = {
        //   fullName: investor.fullname,
        //   address: investor.address,
        //   profession: investor.profession,
        //   workplace: investor.workplace,
        //   category: investor.category,
        //   status: investor.status,
        // };

        // await tx.auditLog.create({
        //   data: {
        //     adminName: 'Self-Registration',  // 
        //     adminProfileId: null, // Executed by the user, not administrative staff
        //     action: 'investor_registered',
        //     module: LogModule.USER,
        //     severity: LogSeverity.INFO,
        //     status: LogStatus.SUCCESS,
        //     targetLabel: `Investor Profile Created: ${investor.fullname}`,
        //     targetTable: 'investors',
        //     targetId: investor.id,
        //     oldValue: Prisma.DbNull, // No previous state on creation
        //     newValue: auditPayload as unknown as Prisma.InputJsonValue,
        //     metadata: {
        //       referralApplied: !!referralCodeRecord,
        //       referralCodeUsed: dto.referralCode || null,
        //     } as Prisma.InputJsonValue,
        //     ipAddress: context?.ipAddress || null,
        //     userAgent: context?.userAgent || null,
        //     sessionId: context?.sessionId || null,
        //   }
        // })

        // Notification
        await tx.adminNotification.create({
          data: {
            type: 'new_investment_request' as AdminNotificationType,
            referenceId: investor.id,
            message: `New profile registration: ${investor.fullname} (Status: pending) has uploaded KYC documents and is waiting for your manual review.`,
            isRead: false,
            clickLink: `/admin/investors/${investor.id}`,
          },
        });

        return investor;
      })
    } catch (err) {
      // Backstop for the duplicate-investor race: DB unique constraint on
      // Investor.userId turns a rare concurrent double-submit into a clean 409
      // instead of a raw Prisma error.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('An Investor profile already exists for this user account.');
      }
      throw err;
    }
  } //end of the Block

  // ---------------------------------
  async update(id: string, dto: UpdateInvestorDto) {
    const investor = await this.findOne(id);

    return "Investor Data";
  }
}
