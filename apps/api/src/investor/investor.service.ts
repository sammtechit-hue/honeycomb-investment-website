import {
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Injectable()
export class InvestorService {
  constructor(private readonly prisma: PrismaService) { }

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
}
