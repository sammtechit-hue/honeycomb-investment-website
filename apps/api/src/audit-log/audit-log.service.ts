import { Injectable } from '@nestjs/common';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';

@Injectable()
export class AuditLogService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    // For Getting All AuditLog's Data with filtering, searching, sorting & pagination
    // Example: GET /api/audit-log?search=verified_kyc&status=verified_kyc&category=audit_log&page=1&limit=10
    async findAllLog({
        search,
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    }: {
        search?: string;
        status?: string;
        category?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {

        return {
            message: "HelloWorld Return all AuditLog's data",
        };
    }

    // For Getting One AuditLog's Data
    async findOne(id: string) {
        return id + "This route is for AuditLog who will see their necessary data and partially modify data";
    }

    // For updating AuditLog Information
    async update(id: string, updateAuditLogDto: UpdateAuditLogDto){
        return {
            message: 'AuditLog Updated Successfully'
        }
    }

}
