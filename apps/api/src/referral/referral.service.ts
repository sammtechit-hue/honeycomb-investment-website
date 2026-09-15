import { Injectable } from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';

@Injectable()
export class ReferralService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All Referral's Data with filtering, searching, sorting & pagination
  // Example: GET /referral?search=pending&status=pending&category=referral&page=1&limit=10
  async findAll({
    search,
    status,
    category,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    min,
    max,
  }: {
    search?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return {
      message: "HelloWorld Return all Referral's data",
    };
  }

  // For Getting One Referral's Data
  async findOne(id: string) {
    return id + 'This route is for Referral who will see their necessary data and partially modify data';
  }

  // For Creating Referral
  async create(createReferralDto: CreateReferralDto) {
    const { referrerId, newInvestorId, bonusPercent } = createReferralDto;

    return {
      message: 'Referral Created Successfully',
    };
  }

  // For updating Referral Information
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
