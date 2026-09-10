import { Injectable } from '@nestjs/common';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';

@Injectable()
export class AuditLogService {
    constructor(
        // PrismaService gives us access to PostgreSQL
        // through Prisma ORM.
        // private readonly prisma: PrismaService,
    ) { }

    async findAllLog(){
        return ["das", "dsad", "asd"];
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
