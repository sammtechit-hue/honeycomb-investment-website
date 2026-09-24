import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogQueryDto } from './dto/query-audit-log.dto';
import { AuditLogService } from './audit-log.service';

// Audit log endpoints (read/correct access) — same AuditLog table as the
// admin module, exposed without create.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('audit-log')
@UsePipes(ZodValidationPipe)
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
    ) { }

    // For getting all audit log entries with filtering, searching, sorting &
    // pagination.
    // GET /api/audit-log?search=verified&action=verified_kyc&targetTable=investors
    //   &createdFrom=&createdTo=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAllLog(@Query() query: AuditLogQueryDto) {
        // Search, filters, created-at range, sort and pagination are validated
        // by AuditLogQueryDto.
        return this.auditLogService.findAllLog(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.auditLogService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateAuditLogDto: UpdateAuditLogDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.auditLogService.update(id, updateAuditLogDto);
    }
}
