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
    async update(id: string, updateInvestmentDto: UpdateInvestmentDto){
        return {
            message: 'Investment Updated Successfully'
        }
    }

}
