import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateInvestorDto } from './dto/update-investor.dto';

@Injectable()
export class InvestorService {
    constructor(private readonly prisma: PrismaService) { }

    // For Getting One Investor's Data
    async findOne(id: string) {
        const investor = await this.prisma.investor.findUnique({ where: { id } });

        if (!investor) {
            throw new NotFoundException(`Investor ${id} not found`);
        }

        return investor;
    }

    // For updating Investor Information
    async update(id: string, updateInvestorDto: UpdateInvestorDto) {
        await this.findOne(id);

        return this.prisma.investor.update({
            where: { id },
            data: updateInvestorDto,
        });
    }

}
