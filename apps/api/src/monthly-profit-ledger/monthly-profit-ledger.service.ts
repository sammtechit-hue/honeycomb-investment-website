import { Injectable } from '@nestjs/common';
import { CreateMonthlyProfitLedgerDto } from './dto/create-monthly-profit-ledger.dto';
import { UpdateMonthlyProfitLedgerDto } from './dto/update-monthly-profit-ledger.dto';

@Injectable()
export class MonthlyProfitLedgerService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) { }

  // For Getting All MonthlyProfitLedger's Data with filtering, searching, sorting & pagination
  // Example: GET /monthly-profit-ledger?search=investment_id&status=accrued&category=accrued&page=1&limit=10
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
    min?: number;
    max?: number;
  }) {
    return {
      message: "HelloWorld Return all MonthlyProfitLedger's data",
    };
  }

  // For Getting One MonthlyProfitLedger's Data
  async findOne(id: string) {
    return id + 'This route is for MonthlyProfitLedger who will see their necessary data and partially modify data';
  }

  // For Creating MonthlyProfitLedger
  async create(createMonthlyProfitLedgerDto: CreateMonthlyProfitLedgerDto) {
    return {
      message: 'MonthlyProfitLedger Created Successfully',
    };
  }

  // For updating MonthlyProfitLedger Information
  async update(id: string, updateMonthlyProfitLedgerDto: UpdateMonthlyProfitLedgerDto) {
    return {
      message: 'MonthlyProfitLedger Updated Successfully',
    };
  }

  // For deleting MonthlyProfitLedger
  async remove(id: string) {
    return {
      message: 'MonthlyProfitLedger Deleted Successfully',
    };
  }
}
