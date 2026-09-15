import { Body, Controller, Get, Param, Post, Patch, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Controller('admin/audit-log')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
    ) { }

    // GET /admin/audit-log?search=verified&targetTable=investor&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('action') action?: string,
        @Query('targetTable') targetTable?: string,
        @Query('adminId') adminId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        return this.auditLogService.findAll({
            search,
            action,
            targetTable,
            adminId,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            sortBy: sortBy ?? 'createdAt',
            sortOrder: sortOrder ?? 'desc',
        });
    }

    // POST /admin/audit-log
    @Post()
    create(@Body() createAuditLogDto: { action: string; targetTable: string; targetId: string; details?: any; adminId: string }) {
        return this.auditLogService.create(createAuditLogDto);
    }

    // GET /admin/audit-log/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.auditLogService.findOne(id);
    }

    // PATCH /admin/audit-log/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateAuditLogDto: { details?: any; action?: string },
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.auditLogService.update(id, updateAuditLogDto);
    }
}
