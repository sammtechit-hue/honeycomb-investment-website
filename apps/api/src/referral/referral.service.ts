import { Injectable } from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralQueryDto } from './dto/query-referral.dto';

@Injectable()
export class ReferralService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All Referral's Data with filtering, searching, sorting & pagination
  // Example: GET /referral?search=ABC123&referrerId=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  async findAll(query: ReferralQueryDto) {
    // Available filters: search, referrerId, referredInvestorId,
    // referralCodeId, minBonusAmount, maxBonusAmount, fromDate, toDate,
    // page, limit, sortBy, sortOrder
    const {
      search,
      referrerId,
      referredInvestorId,
      referralCodeId,
      minBonusAmount,
      maxBonusAmount,
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    return {
      message: "HelloWorld Return all Referral's data",
    };
  }

  // For Getting One Referral's Data
  async findOne(id: string) {
    return id + 'This route is for Referral who will see their necessary data and partially modify data';
  }

  // For Creating Referral
  // Validated fields: referrerId, referredInvestorId, referralCodeId,
  // bonusPercent (defaults to 1.00), bonusAmount
  async create(createReferralDto: CreateReferralDto) {
    const { referrerId, referredInvestorId, referralCodeId } = createReferralDto;

    return {
      message: 'Referral Created Successfully',
    };
  }

  // For updating Referral Information
  // All fields optional — only provided fields are updated.
  async update(id: string, updateReferralDto: UpdateReferralDto) {
    return {
      message: 'Referral Updated Successfully',
    };
  }

  // For deleting Referral
  async remove(id: string) {
    return {
      message: 'Referral Deleted Successfully',
    };
  }
}
