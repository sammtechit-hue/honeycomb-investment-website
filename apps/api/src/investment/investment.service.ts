import { Injectable } from '@nestjs/common';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';

@Injectable()
export class InvestmentService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All Investment's Data with filtering, searching, sorting & pagination
    // Example: GET /investment?search=&status=active&investmentType=fixed&page=1&limit=10
    async findAll(query: InvestmentQueryDto) {
        return 'Return all investment List';
    }

    // For Getting One Investment's Data
    async findOne(id: string) {
        return id + "This route is for Investment who will see their necessary data and partially modify data";
    }

    // For Creating Investment
    async create(createInvestmentDto: CreateInvestmentDto) {
        const { projectId, amount } = createInvestmentDto;

        return {
            message: 'Investment Created Successfully',
        };
    }

    // For updating Investment Information
    async update(id: string, updateInvestmentDto: UpdateInvestmentDto){
        return {
            message: 'Investment Updated Successfully'
        }
    }

}
