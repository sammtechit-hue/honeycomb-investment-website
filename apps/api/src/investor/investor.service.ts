import { Injectable } from '@nestjs/common';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Injectable()
export class InvestorService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }
    
    //For Getting One Investor's Data
    async findOne(id: string) {
        return id + "This route is for Investor who will see their necessary data and partially modify data";
    }

    //For updating Investor Information
    async update(id: string, updateInvestorDto: UpdateInvestorDto){
        return {
            message: 'Investor Updated Successfully'
        }
    }

}
