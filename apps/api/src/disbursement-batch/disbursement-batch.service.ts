import { Injectable } from '@nestjs/common';
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';

@Injectable()
export class DisbursementBatchService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All DisbursementBatch's Data with filtering, searching, sorting & pagination
  // Example: GET /disbursement-batch?search=slot_1&status=draft&category=cbl&page=1&limit=10
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
      message: "HelloWorld Return all DisbursementBatch's data",
    };
  }

  // For Getting One DisbursementBatch's Data
  async findOne(id: string) {
    return id + 'This route is for DisbursementBatch who will see their necessary data and partially modify data';
  }

  // For Creating DisbursementBatch
  async create(createDisbursementBatchDto: CreateDisbursementBatchDto) {
    const { slot, slotLabel, batchDate } = createDisbursementBatchDto;

    return {
      message: 'DisbursementBatch Created Successfully',
    };
  }

  // For updating DisbursementBatch Information
  async update(id: string, updateDisbursementBatchDto: UpdateDisbursementBatchDto) {
    return {
      message: 'DisbursementBatch Updated Successfully',
    };
  }

  // For deleting DisbursementBatch
  async remove(id: string) {
    return {
      message: 'DisbursementBatch Deleted Successfully',
    };
  }
}
