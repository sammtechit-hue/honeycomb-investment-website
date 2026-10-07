import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from '../admin/project/dto/create-project.dto';
import { ProjectQueryDto } from '../admin/project/dto/query-project.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@investment-platform/db';

const PUBLIC_PROJECT_SELECT = {
    id: true,
    name: true,
    description: true,
    status: true,
    minimumInvestment: true,
    startDate: true,
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ProjectService {
    constructor(private readonly prisma: PrismaService) { }

    // GET /api/admin/project
    async findAll(query: ProjectQueryDto) {
        const {
            search,
            status,
            isActive,
            isVisible,
            minInvestment,
            maxInvestment,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        // 1. Build the WHERE clause from whichever filters were provided.
        const where: Prisma.ProjectWhereInput = {
            ...(status && { status }),
            ...(isActive !== undefined && { isActive }),
            ...(isVisible !== undefined && { isVisible }),
            ...((minInvestment !== undefined || maxInvestment !== undefined) && {
                minimumInvestment: {
                    ...(minInvestment !== undefined && { gte: minInvestment }),
                    ...(maxInvestment !== undefined && { lte: maxInvestment }),
                },
            }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        // Tie-breaker on id keeps pagination deterministic.
        const orderBy: Prisma.ProjectOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            ...(sortBy !== 'id' ? [{ id: 'asc' as const }] : []),
        ];


        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                select: PUBLIC_PROJECT_SELECT,
            }),
            this.prisma.project.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            message: 'Projects fetched successfully',
            success: true,
            data: projects,
            meta: {
                page,
                limit,
                total,
                totalPages,
                // hasNextPage: page < totalPages,
                // hasPreviousPage: page > 1,
            },
        };
    }

    // For Getting One Project's Data
    async findOne(id: string) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            select: PUBLIC_PROJECT_SELECT,
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return {
            message: 'Project fetched successfully',
            success: true,
            data: project,
        };
    }
}
