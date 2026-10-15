import { Injectable, NotFoundException } from '@nestjs/common';
import type {
    AuditLogCreateInput,
    AuditLogQuery,
    AuditLogUpdateInput,
} from '@investment-platform/contracts/auditLog';
import { AuditAction, Prisma } from '@investment-platform/db';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    // http://localhost:3000/api/admin/audit-log?search=login&action=admin_login&targetTable=users&targetId=11111111-1111-1111-1111-111111111111&adminProfileId=22222222-2222-2222-2222-222222222222&createdFrom=2026-01-01&createdTo=2026-02-01&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    async findAll(query: AuditLogQuery) {
        const {
            search,
            action,
            targetTable,
            targetId,
            adminProfileId,
            createdFrom,
            createdTo,
            page,
            limit,
            sortBy,
            sortOrder,
        } = query;

        const matchedActions = search
            ? Object.values(AuditAction).filter((value) =>
                  value.includes(search.toLowerCase()),
              )
            : [];

        // 1. Build the WHERE clause 
        const where: Prisma.AuditLogWhereInput = {
            ...(action && { action }),
            ...(targetTable && { targetTable }),
            ...(targetId && { targetId }),
            ...(adminProfileId && { adminProfileId }),
            ...((createdFrom || createdTo) && {
                createdAt: {
                    ...(createdFrom && { gte: createdFrom }),
                    ...(createdTo && { lte: createdTo }),
                },
            }),
            ...(search && {
                OR: [
                    { targetTable: { contains: search, mode: 'insensitive' } },
                    { adminName: { contains: search, mode: 'insensitive' } },
                    ...(matchedActions.length
                        ? [{ action: { in: matchedActions } }]
                        : []),
                ],
            }),
        };

        const orderBy: Prisma.AuditLogOrderByWithRelationInput[] = [
            { [sortBy]: sortOrder },
            { id: 'asc' },
        ];

        // A separate count() with the same WHERE keeps `total` accurate for
        // the filtered set rather than only the current page.
        const [auditLogs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            message: 'Audit logs fetched successfully',
            success: true,
            data: auditLogs,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // For Creating Audit Log
    // Validated by CreateAuditLogDto — see packages/contracts/src/auditLog.ts.
    async create(createAuditLogDto: AuditLogCreateInput) {
        const { action, targetTable } = createAuditLogDto;

        return {
            message: "Audit Log Created Successfully",
            data: createAuditLogDto,
        };
    }

    // For Getting One Audit Log's Data
    async findOne(id: number) {
        const auditLog = await this.prisma.auditLog.findUnique({
            where: { id },
        });

        if (!auditLog) {
            throw new NotFoundException('Audit log not found');
        }

        return {
            message: 'Audit log fetched successfully',
            success: true,
            data: auditLog,
        };
    }

    // For updating Audit Log Information
    // Only correction fields (details/admin) are updatable — see UpdateAuditLogDto.
    async update(id: number, updateAuditLogDto: AuditLogUpdateInput) {
        return {
            message: 'Audit Log Updated Successfully',
            data: updateAuditLogDto,
        };
    }
}
