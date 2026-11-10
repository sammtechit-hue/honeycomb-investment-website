import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Ip,
    Param,
    ParseUUIDPipe,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { CreateDisbursementBatchDto } from './dto/create-disbursement-batch.dto';
import { UpdateDisbursementBatchDto } from './dto/update-disbursement-batch.dto';
import { DisbursementBatchQueryDto } from './dto/query-disbursement-batch.dto';
import { DisbursementBatchService } from './disbursement-batch.service';

// Admin disbursement batch endpoints — list/filter batches, create a batch
// draft and move it through draft → exported → confirmed.
// Validation is scoped to this controller (@UsePipes): the global class-validator
// pipe strips every field on zod DTOs. See main.ts.
@Controller('admin/disbursement-batch')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class DisbursementBatchController {
    constructor(
        private readonly disbursementBatchService: DisbursementBatchService,
    ) { }

    // GET /api/admin/disbursement-batch?search=1st&exportType=cbl&status=draft
    //   &page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: DisbursementBatchQueryDto) {
        // Search, filters, sort and pagination are validated by
        // DisbursementBatchQueryDto.
        return this.disbursementBatchService.findAllDisbursementBatch(query);
    }

    // POST /api/admin/disbursement-batch/:windowId
    @Post(':windowId')
    create(
        @Param('windowId', ParseUUIDPipe) windowId: string,
        @Body() createDisbursementBatchDto: CreateDisbursementBatchDto,
        @CurrentUser() user: AuthenticatedUser,
        @Ip() ip?: string,
        @Headers('user-agent') userAgent?: string,
        @Headers('x-session-id') sessionId?: string,
    ) {
        const context = {
            ipAddress: ip,
            userAgent: userAgent,
            sessionId: sessionId,
        };

        // Create a new disbursement batch record for the PayoutWindow in the
        // route: slotLabel is derived from the window, batchDate/exportType
        // come from the body, and status defaults to draft.
        return this.disbursementBatchService.createDisbursementBatch(
            windowId,
            createDisbursementBatchDto,
            user?.userId,
            context,
        );
    }

    // PATCH /api/admin/disbursement-batch/:id
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDisbursementBatchDto: UpdateDisbursementBatchDto,
        @CurrentUser() user: AuthenticatedUser,
        @Ip() ip?: string,
        @Headers('user-agent') userAgent?: string,
        @Headers('x-session-id') sessionId?: string,
    ) {
        const context = {
            ipAddress: ip,
            userAgent: userAgent,
            sessionId: sessionId,
        };

        // Only the fields provided in the request
        // will be updated.
        return this.disbursementBatchService.update(
            id,
            updateDisbursementBatchDto,
            user?.userId,
            context,
        );
    }

    // DELETE /api/admin/disbursement-batch/:id
    // Destructive: only ADMIN may delete (SUPER_ADMIN passes via RolesGuard).
    // MODERATOR is denied here even though the class allows ADMIN + MODERATOR.
    @Delete(':id')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthenticatedUser,
        @Ip() ip?: string,
        @Headers('user-agent') userAgent?: string,
        @Headers('x-session-id') sessionId?: string,
    ) {
        // Delete a draft disbursement batch by id (draft-only service guard)
        const context = {
            ipAddress: ip,
            userAgent: userAgent,
            sessionId: sessionId,
        };

        // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
        return this.disbursementBatchService.remove(id, user?.userId, context);
    }
}
