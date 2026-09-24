import { Injectable } from '@nestjs/common';
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';
import { DisbursementBatchQueryDto } from './dto/query-disbursement-batch.dto';

@Injectable()
export class DisbursementBatchService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All DisbursementBatch's Data with filtering, searching, sorting & pagination
  // Example: GET /disbursement-batch?search=1st&slot=slot_1&exportType=cbl&status=draft&page=1&limit=10
  async findAll(query: DisbursementBatchQueryDto) {
    // Available filters: search, slot, exportType, status,
    // page, limit, sortBy, sortOrder
    const {
      search,
      slot,
      exportType,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    return {
      message: "HelloWorld Return all DisbursementBatch's data",
    };
  }

  // For Getting One DisbursementBatch's Data
  async findOne(id: string) {
    return id + 'This route is for DisbursementBatch who will see their necessary data and partially modify data';
  }

  // For Creating DisbursementBatch
  // Validated fields: slot, slotLabel, batchDate, exportType, fileUrl, status
  async create(createDisbursementBatchDto: CreateDisbursementBatchDto) {
    const { slot, slotLabel, batchDate, exportType } = createDisbursementBatchDto;

    return {
      message: 'DisbursementBatch Created Successfully',
    };
  }

  // For updating DisbursementBatch Information
  // All fields optional — only provided fields are updated.
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
