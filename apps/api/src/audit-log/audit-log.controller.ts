import { Body, Controller, Get, Param, Post, Patch, Delete } from '@nestjs/common';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
    ) { }

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
