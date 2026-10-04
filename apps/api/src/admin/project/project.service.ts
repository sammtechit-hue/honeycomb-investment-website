import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/query-project.dto';
import { RequestAuditContext } from '../../utils/common types';
import { Prisma, LogModule, LogSeverity, LogStatus, AuditAction } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';


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
                // select: { id: true, name: true, status: true, ... } // trim for list views
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


    // For Creating Project
    async create(
        createProjectDto: CreateProjectDto,
        userId: string | undefined,
        context?: RequestAuditContext,
    ) {
        try {
            await this.prisma.$transaction(async (tx) => {

                const project = await tx.project.create({
                    data: {
                        name: createProjectDto.name,
                        description: createProjectDto.description,
                        status: createProjectDto.status,
                        minimumInvestment: createProjectDto.minimumInvestment,
                        maximumInvestment: createProjectDto.maximumInvestment,
                        targetAmount: createProjectDto.targetAmount,
                        startDate: createProjectDto.startDate,
                        endDate: createProjectDto.endDate,
                        isActive: createProjectDto.isActive,
                        isVisible: createProjectDto.isVisible,
                    },
                });


                // Resolve the admin's profile (id + name) from userId, once.
                let adminProfileId: string | null = null;
                let adminName = 'Admin';

                if (userId) {
                    const adminProfile = await tx.adminProfile.findUnique({
                        where: { userId },
                        select: { id: true, name: true },
                    });

                    if (adminProfile) {
                        adminProfileId = adminProfile.id;
                        adminName = adminProfile.name ?? 'Admin'; // name is optional in schema
                    }
                }

                await tx.auditLog.create({
                    data: {
                        adminName,
                        adminProfileId,
                        action: AuditAction.project_created,
                        module: LogModule.PROJECT,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Project Created: ${project.name}`,
                        targetTable: 'projects',
                        targetId: project.id,
                        oldValue: Prisma.DbNull,
                        newValue: {
                            name: project.name,
                            status: project.status,
                            minimumInvestment: project.minimumInvestment,
                            maximumInvestment: project.maximumInvestment,
                            targetAmount: project.targetAmount,
                            startDate: project.startDate,
                            endDate: project.endDate,
                        } as unknown as Prisma.InputJsonValue,
                        // metadata: {} as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress || null,
                        userAgent: context?.userAgent || null,
                        sessionId: context?.sessionId || null,
                    },
                });
            });

            return {
                message: 'Project Created Successfully',
                success: true,
            };
        } catch (err) {
            // Only handle Prisma errors we can turn into a meaningful, actionable
            // response. Anything else bubbles up to Nest's global filter as a 500.
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2002') {
                    throw new ConflictException('A project with this name already exists.');
                }
                if (err.code === 'P2003') {
                    throw new BadRequestException('One or more referenced records do not exist.');
                }
            }
            throw err;
        }
    }

    
    async update(id: string, updateProjectDto: UpdateProjectDto) {
        return {
            message: 'Project Updated Successfully',
        };
    }

    // For deleting Project
    async remove(id: string) {
        return {
            message: 'Project Deleted Successfully',
        };
    }
}
