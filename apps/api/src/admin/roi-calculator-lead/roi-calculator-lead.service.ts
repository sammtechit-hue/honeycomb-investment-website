import { Injectable } from '@nestjs/common';
import { UpdateRoiCalculatorLeadDto } from './dto/update-roi-calculator-lead.dto';
import { RoiCalculatorLeadQueryDto } from './dto/query-roi-calculator-lead.dto';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoiCalculatorLeadService {
    constructor(private readonly prisma: PrismaService) { }

    
    // For Getting All RoiCalculatorLead's Data with filtering, searching, sorting & pagination
    // Example: GET /roi-calculator-lead?search=john&status=pending&category=lead&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    async findAll( query: RoiCalculatorLeadQueryDto ) {
        return {
            message: "HelloWorld Return all RoiCalculatorLead's data",
        };
    }

    // For Getting One RoiCalculatorLead's Data
    async findOne(id: string) {
        return id + 'This route is for RoiCalculatorLead who will see their necessary data and partially modify data';
    }

    // For updating followedUp status (admin follow-up tracking)
    async update(id: string, dto: UpdateRoiCalculatorLeadDto) {
        return {
            message: 'RoiCalculatorLead followedUp status updated successfully',
        };
    }

    // For remove a row in RoiCalculatorLead
    async remove(id: string) {
    return { message: 'A RoiCalculatorLead has been removed successfully' };
  }
}
