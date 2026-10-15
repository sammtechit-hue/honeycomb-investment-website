import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLogQueryDto } from './dto/query-audit-log.dto';
import { AuditLogService } from './audit-log.service';

// Admin endpoints for the audit trail — who did what, to which row, when.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why. Audit records are sensitive, so the whole controller
// requires authenticated staff (@Roles; SUPER_ADMIN bypasses via RolesGuard).
@Controller('admin/audit-log')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditLogController {
    constructor(
        private readonly auditLogService: AuditLogService,
    ) { }

    // http://localhost:3000/api/admin/audit-log?search=login&action=admin_login&targetTable=users&targetId=11111111-1111-1111-1111-111111111111&adminProfileId=22222222-2222-2222-2222-222222222222&createdFrom=2026-01-01&createdTo=2026-02-01&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: AuditLogQueryDto) {
        return this.auditLogService.findAll(query);
    }
    
    // GET /admin/audit-log/:id
    // AuditLog.id is an auto-increment Int (see schema.prisma §20).
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.auditLogService.findOne(id);
    }

    // POST /admin/audit-log
    // Creates an audit entry — `action`/`targetTable`/`targetId` required,
    @Post()
    create(@Body() createAuditLogDto: CreateAuditLogDto) {
        return this.auditLogService.create(createAuditLogDto);
    }

    // PATCH /admin/audit-log/:id
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateAuditLogDto: UpdateAuditLogDto,
    ) {
        return this.auditLogService.update(id, updateAuditLogDto);
    }
}
