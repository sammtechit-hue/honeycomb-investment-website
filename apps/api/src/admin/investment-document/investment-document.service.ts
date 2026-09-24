import { Injectable } from '@nestjs/common';
import type {
    InvestmentDocumentCreateInput,
    InvestmentDocumentQuery,
    InvestmentDocumentUpdateInput,
} from '@investment-platform/contracts/investmentDocument';

@Injectable()
export class InvestmentDocumentService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All InvestmentDocument's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/investment-document?hasDocument=certificate&page=1&limit=10
    // Validated/normalized by InvestmentDocumentQueryDto — all fields are typed.
    async findAll(query: InvestmentDocumentQuery) {
        return {
            message: "Return all InvestmentDocument's data",
            query,
        };
    }

    // For Getting One InvestmentDocument's Data
    async findOne(id: string) {
        return { message: `${id} - Return a single investment document bundle` };
    }

    // For Creating InvestmentDocument
    // Validated by CreateInvestmentDocumentDto — the eight document slots plus
    // the owning investment; Prisma enforces one bundle per investment.
    async create(createInvestmentDocumentDto: InvestmentDocumentCreateInput) {
        return {
            message: 'InvestmentDocument Created Successfully',
            data: createInvestmentDocumentDto,
        };
    }

    // For updating InvestmentDocument Information
    // Because investment_documents has no timestamps, a handover is recorded by
    // setting the slot's file URL — see UpdateInvestmentDocumentDto.
    async update(id: string, updateInvestmentDocumentDto: InvestmentDocumentUpdateInput) {
        return {
            message: 'InvestmentDocument Updated Successfully',
            data: updateInvestmentDocumentDto,
        };
    }

    // For deleting InvestmentDocument
    async remove(id: string) {
        return {
            message: 'InvestmentDocument Deleted Successfully',
        };
    }
}
