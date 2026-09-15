import { Injectable } from '@nestjs/common';
import { CreateInvestorBankAccountDto } from './dto/create-investor-bank-account.dto';
import { UpdateInvestorBankAccountDto } from './dto/update-investor-bank-account.dto';

@Injectable()
export class InvestorBankAccountService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All InvestorBankAccount's Data with filtering, searching, sorting & pagination
  // Example: GET /investor-bank-account?search=cbl&status=active&category=savings&page=1&limit=10
  async findAll({
    search,
    status,
    category,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
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
      message: "HelloWorld Return all InvestorBankAccount's data",
    };
  }

  // For Getting One InvestorBankAccount's Data
  async findOne(id: string) {
    return id + 'This route is for InvestorBankAccount who will see their necessary data and partially modify data';
  }

  // For Creating InvestorBankAccount
  async create(createInvestorBankAccountDto: CreateInvestorBankAccountDto) {
    const { bankName, accountName, accountNumber } = createInvestorBankAccountDto;

    return {
      message: 'InvestorBankAccount Created Successfully',
    };
  }

  // For updating InvestorBankAccount Information
  async update(id: string, updateInvestorBankAccountDto: UpdateInvestorBankAccountDto) {
    return {
      message: 'InvestorBankAccount Updated Successfully',
    };
  }

  // For deleting InvestorBankAccount
  async remove(id: string) {
    return {
      message: 'InvestorBankAccount Deleted Successfully',
    };
  }
}
