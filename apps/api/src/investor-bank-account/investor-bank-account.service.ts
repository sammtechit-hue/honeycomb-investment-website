import { Injectable } from '@nestjs/common';
import type {
  InvestorBankAccountCreateInput,
  InvestorBankAccountQuery,
  InvestorBankAccountUpdateInput,
} from '@investment-platform/contracts/investorBankAccount';

@Injectable()
export class InvestorBankAccountService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All InvestorBankAccount's Data with filtering, searching, sorting & pagination
  // Example: GET /investor-bank-account?isActive=true&page=1&limit=10
  // Validated/normalized by InvestorBankAccountQueryDto — all fields are typed.
  async findAll(query: InvestorBankAccountQuery) {
    return {
      message: "Return all InvestorBankAccount's data",
      query,
    };
  }

  // For Getting One InvestorBankAccount's Data
  async findOne(id: string) {
    return { message: `${id} - Return a single investor bank account` };
  }

  // For Creating InvestorBankAccount
  // Validated by CreateInvestorBankAccountDto — the account may start inactive;
  // activating it means deactivating the investor's other accounts in the same
  // transaction, since exactly one row should carry isActive.
  async create(createInvestorBankAccountDto: InvestorBankAccountCreateInput) {
    const { investorId, isActive } = createInvestorBankAccountDto;

    return {
      message: 'InvestorBankAccount Created Successfully',
      data: createInvestorBankAccountDto,
    };
  }

  // For updating InvestorBankAccount Information
  // Only the fields provided in the request will be updated; switching
  // `isActive` to true must deactivate the investor's other accounts.
  async update(id: string, updateInvestorBankAccountDto: InvestorBankAccountUpdateInput) {
    return {
      message: 'InvestorBankAccount Updated Successfully',
      data: updateInvestorBankAccountDto,
    };
  }

  // For deleting InvestorBankAccount
  async remove(id: string) {
    return {
      message: 'InvestorBankAccount Deleted Successfully',
    };
  }
}
