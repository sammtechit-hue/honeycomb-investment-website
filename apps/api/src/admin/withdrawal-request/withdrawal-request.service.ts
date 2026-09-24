import { Injectable } from '@nestjs/common';
import type {
  WithdrawalRequestCreateInput,
  WithdrawalRequestQuery,
  WithdrawalRequestUpdateInput,
} from '@investment-platform/contracts/withdrawal-request';

@Injectable()
export class WithdrawalRequestService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All WithdrawalRequest's Data with filtering, searching, sorting & pagination
  // Example: GET /withdrawal-request?status=pending&withdrawalMethod=manual&page=1&limit=10
  // Validated/normalized by WithdrawalRequestQueryDto — all fields are typed.
  async findAll(query: WithdrawalRequestQuery) {
    return {
      message: "HelloWorld Return all WithdrawalRequest's data",
      query,
    };
  }

  // For Getting One WithdrawalRequest's Data
  async findOne(id: string) {
    return id + 'This route is for WithdrawalRequest who will see their necessary data and partially modify data';
  }

  // For Creating WithdrawalRequest
  // Validated by CreateWithdrawalRequestDto — see
  // packages/contracts/src/withdrawal-request.ts.
  async create(createWithdrawalRequestDto: WithdrawalRequestCreateInput) {
    return {
      message: 'WithdrawalRequest Created Successfully',
      data: createWithdrawalRequestDto,
    };
  }

  // For updating WithdrawalRequest Information
  // Only the fields provided in the request will be updated.
  async update(id: string, updateWithdrawalRequestDto: WithdrawalRequestUpdateInput) {
    return {
      message: 'WithdrawalRequest Updated Successfully',
      data: updateWithdrawalRequestDto,
    };
  }

  // For deleting WithdrawalRequest
  async remove(id: string) {
    return {
      message: 'WithdrawalRequest Deleted Successfully',
    };
  }
}
