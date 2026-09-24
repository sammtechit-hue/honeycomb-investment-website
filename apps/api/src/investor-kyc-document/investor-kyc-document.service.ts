import { Injectable } from '@nestjs/common';
import type {
  InvestorKycDocumentCreateInput,
  InvestorKycDocumentQuery,
  InvestorKycDocumentUpdateInput,
} from '@investment-platform/contracts/investorKycDocument';

@Injectable()
export class InvestorKycDocumentService {
  constructor(
    // PrismaService gives us access to PostgreSQL
    // through Prisma ORM.
    // private readonly prisma: PrismaService,
  ) {}

  // For Getting All InvestorKycDocument's Data with filtering, searching, sorting & pagination
  // Example: GET /investor-kyc-document?verificationStatus=pending&page=1&limit=10
  // Validated/normalized by InvestorKycDocumentQueryDto — all fields are typed.
  async findAll(query: InvestorKycDocumentQuery) {
    return {
      message: "Return all InvestorKycDocument's data",
      query,
    };
  }

  // For Getting One InvestorKycDocument's Data
  async findOne(id: string) {
    return { message: `${id} - Return a single investor KYC document` };
  }

  // For Creating InvestorKycDocument
  // Validated by CreateInvestorKycDocumentDto — three file URLs plus the
  // owning investor; Prisma enforces one KYC set per investor.
  async create(createInvestorKycDocumentDto: InvestorKycDocumentCreateInput) {
    // TODO: write an AuditLog entry (action: investor_kyc_uploaded).
    return {
      message: 'InvestorKycDocument Created Successfully',
      data: createInvestorKycDocumentDto,
    };
  }

  // For updating InvestorKycDocument Information
  // Re-uploads only — an investor cannot verify their own documents, so
  // `verificationStatus` is changed by an admin through the admin endpoint.
  async update(id: string, updateInvestorKycDocumentDto: InvestorKycDocumentUpdateInput) {
    return {
      message: 'InvestorKycDocument Updated Successfully',
      data: updateInvestorKycDocumentDto,
    };
  }

  // For deleting InvestorKycDocument
  async remove(id: string) {
    return {
      message: 'InvestorKycDocument Deleted Successfully',
    };
  }
}
