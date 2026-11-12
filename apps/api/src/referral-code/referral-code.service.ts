import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateUniqueReferralCode } from '../utils/common/generateReferralCode.utils';
import { UpdateRefferalCodeDto as UpdateReferralCodeDto } from './dto/update-referral-code.dto';
import { ReferralCodeQueryDto } from './dto/query-referral-code.dto';

@Injectable()
export class ReferralCodeService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  // For getting all RefferalCode's data with filtering, searching, sorting & pagination.
  // Example: GET /refferal-code?search=ABC123&isUsed=false&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  async findAllReferralCode(query: ReferralCodeQueryDto) {

    const {
      search,
      referrerId,
      referredId,
      isUsed,
      expiresAfter,
      expiresBefore,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    return {
      message: "HelloWorld Return all RefferalCode's data",
    };
  }

  // For getting one RefferalCode's data.
  async findOneReferralCode(id: string) {
    return id + 'This route is for RefferalCode who will see their necessary data and partially modify data';
  }

  // --------------------------------------------------------
  // ------------------ Create Referral Code ----------------
  //---------------------------------------------------------
  async createReferralCode(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    // ReferralCode.referrerId references Investor.id, not User.id.
    const investor = await this.prisma.investor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!investor) {
      throw new ForbiddenException(
        'Complete your investor profile before creating a referral code.',
      );
    }

    const referralCode = await this.prisma.$transaction(async (tx) => {
      // An investor keeps one unused, active code at a time.
      const reusableCode = await tx.referralCode.findFirst({
        where: { referrerId: investor.id, isUsed: false, isActive: true },
      });

      if (reusableCode) {
        throw new ForbiddenException(
          'You already have an active, unused referral code.',
        );
      }

      return tx.referralCode.create({
        data: {
          code: await generateUniqueReferralCode(tx),
          referrerId: investor.id,
        },
      });
    });

    return {
      message: 'RefferalCode Created Successfully',
      success: true,
      data: referralCode,
    };
  }
}
