import { Injectable } from '@nestjs/common';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Injectable()
export class InvestorService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    //For Getting All Investor's Data
    async findAll() {
        return "HelloWorld Return all Investor's data"
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
