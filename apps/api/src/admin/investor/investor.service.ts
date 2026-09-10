import { Injectable } from '@nestjs/common';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Injectable()
export class InvestorService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All Investor's Data with filtering, searching, sorting & pagination
    // Example: GET /admin/investor?search=john&status=active&category=gold&page=1&limit=10
    async findAll({
        search,
        status,
        verified_kyc,
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
        verified_kyc?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        min?: number;
        max?: number;
    }) {

        return {
            message: "HelloWorld Return all Investor's data",
        };
    }

    //For Getting One Investor's Data
    async findOne(id: string) {
        return id + "Return a single investor's data";
    }

    //For Creating Investor
    // async create(createInvestorDto: CreateInvestorDto) {
    //     const {
    //   fullName,
    //   address,
    //   phoneNumber,
    //   email,
    //   profession,
    //   workplace,
    //   category,
    //   password,
    // } = createInvestorDto;

    // return {
    //         message: 'Investor Created successfully',
    //     };
    // }

    async update(id: string, updateInvestorDto: UpdateInvestorDto) {
        return {
            message: 'Investor updated successfully'
        };
    }

    async updateStatus(id: string, updateInvestorDto: UpdateInvestorDto) {
        return {
            message: 'Investor status updated successfully'
        };
    }

    async remove(id: string) {
        return {
            message: 'Investor deleted successfully'
        };
    }
}
