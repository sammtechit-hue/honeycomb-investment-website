import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
    ) { }

    @Get()
    findAllLog(
      @Query('search') search?: string,
      @Query('status') status?: string,
      @Query('category') category?: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
      @Query('sortBy') sortBy?: string,
      @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ){
      // GET /api/audit-log?search=verified_kyc&status=verified_kyc&category=audit_log&page=1&limit=10&sortBy=createdAt&sortOrder=desc
      return this.auditLogService.findAllLog({
        search,
        status,
        category,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        sortBy: sortBy ?? 'createdAt',
        sortOrder: sortOrder ?? 'desc',
      });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.auditLogService.findOne(id);
    }

    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() updateAuditLogDto: UpdateAuditLogDto,
    ) {
      // Only the fields provided in the request
      // will be updated.

      return this.auditLogService.update(id, updateAuditLogDto);
    }



}
