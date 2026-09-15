import { Injectable } from '@nestjs/common';
import { CreateDisbursementItemDto } from './dto/create-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';

@Injectable()
export class DisbursementItemService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) { }

  // For Getting All DisbursementItem's Data with filtering, searching, sorting & pagination
  // Example: GET /disbursement-item?search=ROI&status=cbl&category=cbl&page=1&limit=10
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
      message: "HelloWorld Return all DisbursementItem's data",
    };
  }

  // For Getting One DisbursementItem's Data
  async findOne(id: string) {
    return id + 'This route is for DisbursementItem who will see their necessary data and partially modify data';
  }

  // For Creating DisbursementItem
  async create(createDisbursementItemDto: CreateDisbursementItemDto) {
    const { batchId, investorId, reason, amount } = createDisbursementItemDto;

    return {
      message: 'DisbursementItem Created Successfully',
    };
  }

  // For updating DisbursementItem Information
  async update(id: string, updateDisbursementItemDto: UpdateDisbursementItemDto) {
    return {
      message: 'DisbursementItem Updated Successfully',
    };
  }

  // For deleting DisbursementItem
  async remove(id: string) {
    return {
      message: 'DisbursementItem Deleted Successfully',
    };
  }
}
