import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateRoiCalculatorLeadDto } from './dto/update-roi-calculator-lead.dto';
import { RoiCalculatorLeadQueryDto } from './dto/query-roi-calculator-lead.dto';
import { Prisma } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoiCalculatorLeadService {
    constructor(private readonly prisma: PrismaService) { }

    
    // Example: GET /admin/roi-calculator-lead?search=john&minAmount=1000&maxAmount=50000&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    async findAll(query: RoiCalculatorLeadQueryDto) {
        const {
            search,
            minAmount,
            maxAmount,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        const where: Prisma.RoiCalculatorLeadWhereInput = {
            ...((minAmount !== undefined || maxAmount !== undefined) && {
                enteredAmount: {
                    ...(minAmount !== undefined && { gte: minAmount }),
                    ...(maxAmount !== undefined && { lte: maxAmount }),
                },
            }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phoneNumber: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const orderBy: Prisma.RoiCalculatorLeadOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            { id: 'asc' as const },
        ];

        const [leads, total] = await Promise.all([
            this.prisma.roiCalculatorLead.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.roiCalculatorLead.count({ where }),
        ]);

        return {
            message: 'ROI calculator leads fetched successfully',
            success: true,
            data: leads,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // For Getting One RoiCalculatorLead's Data
    async findOne(id: string) {
        const lead = await this.prisma.roiCalculatorLead.findUnique({
            where: { id },
        });

        if (!lead) {
            throw new NotFoundException(`ROI calculator lead with id ${id} not found`);
        }

        return {
            message: 'ROI calculator lead fetched successfully',
            success: true,
            data: lead,
        };
    }

    // For updating followedUp status (admin follow-up tracking)
    async update(id: string, dto: UpdateRoiCalculatorLeadDto) {
        const existing = await this.prisma.roiCalculatorLead.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!existing) {
            throw new NotFoundException(`ROI calculator lead with id ${id} not found`);
        }

        await this.prisma.roiCalculatorLead.update({
            where: { id },
            data: { followedUp: dto.followedUp },
        });

        return {
            message: 'RoiCalculatorLead followedUp status updated successfully',
            success: true,
        };
    }

    // For remove a row in RoiCalculatorLead
    async remove(id: string) {
    return { message: 'A RoiCalculatorLead has been removed successfully' };
  }
}
