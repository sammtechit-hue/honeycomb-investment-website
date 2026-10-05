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


    // PATCH /api/admin/project/:id — partial update. Only fields present in
    async update(
        id: string,
        dto: UpdateProjectDto,
        userId: string,
        context?: RequestAuditContext,
    ) {
        const {
            name, description, status, minimumInvestment, maximumInvestment,
            targetAmount, startDate, endDate, isActive, isVisible,
        } = dto;

        // Prisma skips `undefined` keys, so only fields the client sent are written.
        const data: Prisma.ProjectUpdateInput = {
            name, description, status, minimumInvestment, maximumInvestment,
            targetAmount, startDate, endDate, isActive, isVisible,
        };

        if (Object.values(data).every((v) => v === undefined)) {
            throw new BadRequestException('No fields provided to update');
        }

        // Resolved outside the transaction to keep it (and the row lock) short.
        const admin = await this.prisma.adminProfile.findUnique({
            where: { userId },
            select: { id: true, name: true },
        });

        const existing = await this.prisma.project.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException(`Project with id ${id} not found`);
        }

        const effectiveMinimum = minimumInvestment ?? Number(existing.minimumInvestment);
        const effectiveMaximum =
            maximumInvestment ??
            (existing.maximumInvestment != null ? Number(existing.maximumInvestment) : undefined);
        const effectiveTarget =
            targetAmount ??
            (existing.targetAmount != null ? Number(existing.targetAmount) : undefined);
        const effectiveStartDate = startDate ?? existing.startDate;
        const effectiveEndDate = endDate ?? existing.endDate ?? undefined;

        if (effectiveMaximum !== undefined && effectiveMaximum < effectiveMinimum) {
            throw new BadRequestException(
                'maximumInvestment must be greater than or equal to minimumInvestment',
            );
        }
        if (effectiveTarget !== undefined && effectiveTarget < effectiveMinimum) {
            throw new BadRequestException(
                'targetAmount must be greater than or equal to minimumInvestment',
            );
        }
        // Business rule (confirm you want it): target can't drop below what's already raised.
        if (effectiveTarget !== undefined && effectiveTarget < Number(existing.totalInvestedAmount)) {
            throw new BadRequestException(
                'targetAmount cannot be lower than the amount already invested',
            );
        }
        if (effectiveEndDate !== undefined && effectiveEndDate <= effectiveStartDate) {
            throw new BadRequestException('endDate must be after startDate');
        }
        

        try {
            await this.prisma.$transaction(async (tx) => {
                // Optimistic lock: fails if another request changed the row since we read it.
                let project;
                try {
                    project = await tx.project.update({
                        where: { id, updatedAt: existing.updatedAt },
                        data,
                    });
                } catch (e) {
                    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                        throw new ConflictException(
                            'Project was modified by someone else. Reload and try again.',
                        );
                    }
                    throw e;
                }

                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.project_updated,
                        module: LogModule.PROJECT,
                        severity: LogSeverity.INFO,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Project Updated: ${project.name}`,
                        targetTable: 'projects',
                        targetId: project.id,
                        oldValue: toProjectSnapshot(existing) as unknown as Prisma.InputJsonValue,
                        newValue: toProjectSnapshot(project) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });
            });

            return { message: 'Project Updated Successfully', success: true };
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictException('A project with this name already exists.');
            }
            throw err;
        }
    }

    // DELETE /api/admin/project/:id
    async remove(id: string, userId: string | undefined, context?: RequestAuditContext) {
        const existing = await this.prisma.project.findUnique({
            where: { id },
            include: { _count: { select: { investments: true } } },
        });

        if (!existing) {
            throw new NotFoundException(`Project with id ${id} not found`);
        }

        if (existing._count.investments > 0) {
            throw new ConflictException(
                'This project has investments and cannot be deleted. Set it to inactive/hidden or cancel it instead.',
            );
        }

        // Resolved outside the transaction to keep it (and the row lock) short.
        const admin = userId
            ? await this.prisma.adminProfile.findUnique({
                where: { userId },
                select: { id: true, name: true },
            })
            : null;

        try {
            await this.prisma.$transaction(async (tx) => {
                // Atomic guard: only deletes when no investment landed after our check.
                // delete().where accepts only unique fields, so deleteMany is used here.
                const result = await tx.project.deleteMany({
                    where: { id, investments: { none: {} } },
                });

                if (result.count === 0) {
                    throw new ConflictException(
                        'Project was changed or received an investment. Reload and try again.',
                    );
                }

                await tx.auditLog.create({
                    data: {
                        adminName: admin?.name ?? 'Admin',
                        adminProfileId: admin?.id ?? null,
                        action: AuditAction.project_deleted,
                        module: LogModule.PROJECT,
                        severity: LogSeverity.WARNING,
                        status: LogStatus.SUCCESS,
                        targetLabel: `Project Deleted: ${existing.name}`,
                        targetTable: 'projects',
                        targetId: existing.id,
                        oldValue: toProjectSnapshot(existing) as unknown as Prisma.InputJsonValue,
                        ipAddress: context?.ipAddress ?? null,
                        userAgent: context?.userAgent ?? null,
                        sessionId: context?.sessionId ?? null,
                    },
                });
            });

            return { message: 'Project Deleted Successfully', success: true };
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
                // A foreign key still points at this project.
                throw new ConflictException('Project is referenced by other records and cannot be deleted.');
            }
            throw err;
        }
    }
}

// Shape a Project row for the audit log's oldValue / newValue JSON columns.
// Decimal -> number and Date -> ISO string keep the snapshot JSON-safe.
function toProjectSnapshot(project: {
    name: string;
    description: string | null;
    status: string;
    minimumInvestment: Prisma.Decimal;
    maximumInvestment: Prisma.Decimal | null;
    targetAmount: Prisma.Decimal | null;
    totalInvestedAmount: Prisma.Decimal;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    isVisible: boolean;
}) {
    return {
        name: project.name,
        description: project.description,
        status: project.status,
        minimumInvestment: Number(project.minimumInvestment),
        maximumInvestment:
            project.maximumInvestment != null ? Number(project.maximumInvestment) : null,
        targetAmount: project.targetAmount != null ? Number(project.targetAmount) : null,
        totalInvestedAmount: Number(project.totalInvestedAmount),
        startDate: project.startDate.toISOString(),
        endDate: project.endDate ? project.endDate.toISOString() : null,
        isActive: project.isActive,
        isVisible: project.isVisible,
    };
}
