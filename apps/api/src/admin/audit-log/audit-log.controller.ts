import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogQueryDto } from './dto/query-audit-log.dto';
import { AuditLogService } from './audit-log.service';

// Admin endpoints for the audit trail — who did what, to which row, when.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('admin/audit-log')
@UsePipes(ZodValidationPipe)
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
    ) { }

    // For getting all audit log entries with filtering, searching, sorting &
    // pagination.
    // GET /api/admin/audit-log?search=verified&action=verified_kyc
    //   &targetTable=investors&targetId=&adminProfileId=
    //   &createdFrom=&createdTo=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: AuditLogQueryDto) {
        // Search, filters, created-at range, sort and pagination are validated
        // by AuditLogQueryDto.
        return this.auditLogService.findAll(query);
    }

    // POST /admin/audit-log
    // Creates an audit entry — `action`/`targetTable`/`targetId` required,
    // `details` optional JSON, actor fields optional.
    @Post()
    create(@Body() createAuditLogDto: CreateAuditLogDto) {
        return this.auditLogService.create(createAuditLogDto);
    }

    // GET /admin/audit-log/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.auditLogService.findOne(id);
    }

    // PATCH /admin/audit-log/:id
    // Corrections only — content fields (action/targetTable/targetId) are not
    // updatable, see UpdateAuditLogDto.
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
