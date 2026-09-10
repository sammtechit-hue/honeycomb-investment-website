import { Injectable } from '@nestjs/common';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { CreateInvestmentDto } from './dto/create-investment.dto';

@Injectable()
export class InvestmentService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

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
        return search + "Return all investment List"
    }

    // For Getting One Investment's Data
    async findOne(id: string) {
        return id + "This route is for Investment who will see their necessary data and partially modify data";
    }

    //For Creating Investment
    async create(createInvestmentDto: CreateInvestmentDto) {

        const { email } = createInvestmentDto;

        return {
            message: "Investment Created Successfully"
        }
    }

    // For updating Investment Information
    async update(id: string, updateInvestmentDto: UpdateInvestmentDto) {
        return {
            message: 'Investment Updated Successfully'
        }
    }

}
