import { Injectable } from '@nestjs/common';
import type {
    AuditLogQuery,
    AuditLogUpdateInput,
} from '@investment-platform/contracts/auditLog';

@Injectable()
export class AuditLogService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All AuditLog's Data with filtering, searching, sorting & pagination
    // Example: GET /audit-log?action=verified_kyc&targetTable=investors&page=1&limit=10
    // Validated/normalized by AuditLogQueryDto — all fields are typed.
    async findAllLog(query: AuditLogQuery) {
        return {
            message: "HelloWorld Return all AuditLog's data",
            query,
        };
    }

    // For Getting One AuditLog's Data
    async findOne(id: string) {
        return id + "This route is for AuditLog who will see their necessary data and partially modify data";
    }

    // For updating AuditLog Information
    // Only correction fields (details/admin) are updatable — see UpdateAuditLogDto.
    async update(id: string, updateAuditLogDto: AuditLogUpdateInput) {
        return {
            message: 'AuditLog Updated Successfully',
            data: updateAuditLogDto,
        };
    }
}
