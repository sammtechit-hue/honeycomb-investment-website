import { Injectable } from '@nestjs/common';
import { CreateDisbursementItemDto } from './dto/create-disbursement-item.dto';
import { UpdateDisbursementItemDto } from './dto/update-disbursement-item.dto';
import { DisbursementItemQueryDto } from './dto/query-disbursement-item.dto';

@Injectable()
export class DisbursementItemService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All DisbursementItem's Data with filtering, searching, sorting & pagination
  // Example: GET /disbursement-item?search=ROI&batchId=&exportFormat=cbl&page=1&limit=10
  async findAll(query: DisbursementItemQueryDto) {
    // Available filters: search, batchId, investmentId, investorId,
    // exportFormat, minAmount, maxAmount, page, limit, sortBy, sortOrder
    const {
      search,
      batchId,
      investmentId,
      investorId,
      exportFormat,
      minAmount,
      maxAmount,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    return {
      message: "HelloWorld Return all DisbursementItem's data",
    };
  }

  // For Getting One DisbursementItem's Data
  async findOne(id: string) {
    return id + 'This route is for DisbursementItem who will see their necessary data and partially modify data';
  }

  // For Creating DisbursementItem
  // Validated fields: reason, amount, exportFormat, remarks, investmentId,
  // investorId, batchId and the snapshot* bank details
  async create(createDisbursementItemDto: CreateDisbursementItemDto) {
    const { batchId, investorId, reason, amount } = createDisbursementItemDto;

    return {
      message: 'DisbursementItem Created Successfully',
    };
  }

  // For updating DisbursementItem Information
  // All fields optional — only provided fields are updated.
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
