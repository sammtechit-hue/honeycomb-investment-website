import { Injectable } from '@nestjs/common';
import { CreateInvestorKycDocumentDto } from './dto/create-investor-kyc-document.dto';
import { UpdateInvestorKycDocumentDto } from './dto/update-investor-kyc-document.dto';

@Injectable()
export class InvestorKycDocumentService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All InvestorKycDocument's Data with filtering, searching, sorting & pagination
  // Example: GET /investor-kyc-document?search=nid&status=pending&category=nid&page=1&limit=10
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
      message: "HelloWorld Return all InvestorKycDocument's data",
    };
  }

  // For Getting One InvestorKycDocument's Data
  async findOne(id: string) {
    return id + 'This route is for InvestorKycDocument who will see their necessary data and partially modify data';
  }

  // For Creating InvestorKycDocument
  async create(createInvestorKycDocumentDto: CreateInvestorKycDocumentDto) {
    const { investorId, docType, fileUrl } = createInvestorKycDocumentDto;

    return {
      message: 'InvestorKycDocument Created Successfully',
    };
  }

  // For updating InvestorKycDocument Information
  async update(id: string, updateInvestorKycDocumentDto: UpdateInvestorKycDocumentDto) {
    return {
      message: 'InvestorKycDocument Updated Successfully',
    };
  }

  // For deleting InvestorKycDocument
  async remove(id: string) {
    return {
      message: 'InvestorKycDocument Deleted Successfully',
    };
  }
}
