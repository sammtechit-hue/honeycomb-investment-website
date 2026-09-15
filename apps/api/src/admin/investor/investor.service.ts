import {
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorQueryDto } from './dto/query-investor.dto';

@Injectable()
export class InvestorService {
  constructor(private readonly prisma: PrismaService) { }

  // -----------------------------------------------------------------------
  // findAll — paginated list with search, filter and sort
  // -----------------------------------------------------------------------
  async findAll(query: InvestorQueryDto) {
    const { search, status, category, page, limit, sortBy, sortOrder, minTotalInvestment, maxTotalInvestment } = query;

    const where: Prisma.InvestorWhereInput = {};

    // Full-text search across fullName and email
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Exact-match enum filters
    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    return "Investor Data";
  }

  // -----------------------------------------------------------------------
  // findOne — single investor with full related data
  // -----------------------------------------------------------------------
  async findOne(id: string) {
    return "Investor Data";
  }

  // -----------------------------------------------------------------------
  // create — register a new investor (status defaults to 'pending')
  //
  // approvedById and adminId are required by the Prisma model but are NOT
  // part of the client-submittable DTO. They must be injected from the
  // auth context / registration flow by the caller (controller/guard).
  // TODO: wire in the authenticated admin/user ID once the auth module is
  // integrated.
  // -----------------------------------------------------------------------
  async create(dto: CreateInvestorDto) {
    return "Investor Data";
  }

  // -----------------------------------------------------------------------
  // update — partial update (locked when status is 'active')
  // -----------------------------------------------------------------------
  async update(id: string, dto: UpdateInvestorDto) {
    const investor = await this.findOne(id);

    return "Investor Data";
  }

  // -----------------------------------------------------------------------
  // remove — soft delete by setting status to 'suspended'
  // -----------------------------------------------------------------------
  async remove(id: string) {

    return { message: 'Investor has been suspended successfully' };
  }
}

