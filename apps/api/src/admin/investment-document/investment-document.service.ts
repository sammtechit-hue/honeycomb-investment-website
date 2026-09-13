import { Injectable } from '@nestjs/common';
import { CreateInvestmentDocumentDto } from './dto/create-investment-document.dto';
import { UpdateInvestmentDocumentDto } from './dto/update-investment-document.dto';

@Injectable()
export class InvestmentDocumentService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All InvestmentDocument's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/investment-document?search=deed&status=active&category=certificate&page=1&limit=10
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
            message: "HelloWorld Return all InvestmentDocument's data",
        };
    }

    // For Getting One InvestmentDocument's Data
    async findOne(id: string) {
        return id + 'This route is for InvestmentDocument who will see their necessary data and partially modify data';
    }

    // For Creating InvestmentDocument
    // Expected fields (to be added to the DTO): investmentId, docType, fileUrl
    async create(createInvestmentDocumentDto: CreateInvestmentDocumentDto) {
        return {
            message: 'InvestmentDocument Created Successfully',
        };
    }

    // For updating InvestmentDocument Information
    async update(id: string, updateInvestmentDocumentDto: UpdateInvestmentDocumentDto) {
        return {
            message: 'InvestmentDocument Updated Successfully',
        };
    }

    // For deleting InvestmentDocument
    async remove(id: string) {
        return {
            message: 'InvestmentDocument Deleted Successfully',
        };
    }
}
