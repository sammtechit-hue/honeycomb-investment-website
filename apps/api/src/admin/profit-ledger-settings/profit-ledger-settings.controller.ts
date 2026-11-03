import {
    Body,
    Controller,
    Get,
    Headers,
    Ip,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';
import { CreateProfitLedgerSettingsDto } from './dto/create-profit-ledger-settings.dto';
import { UpdateProfitLedgerSettingsDto } from './dto/update-profit-ledger-settings.dto';
import { ProfitLedgerSettingsQueryDto } from './dto/query-profit-ledger-settings.dto';
import { ProfitLedgerSettingsService } from './profit-ledger-settings.service';

@Controller('admin/profit-ledger-settings')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class ProfitLedgerSettingsController {
    constructor(private readonly profitLedgerSettingsService: ProfitLedgerSettingsService) { }

    // GET /api/admin/profit-ledger-settings?search=&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: ProfitLedgerSettingsQueryDto) {
        return this.profitLedgerSettingsService.findAllProfitLedgerSettings(query);
    }

    // POST /admin/profit-ledger-settings
    @Post()
    @Roles(Role.ADMIN)
    create(
        @Body() createProfitLedgerSettingsDto: CreateProfitLedgerSettingsDto,
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

        return this.profitLedgerSettingsService.createProfitLedgerSettings(
            createProfitLedgerSettingsDto,
            user?.userId,
            context,
        );
    }

    // PATCH /api/admin/profit-ledger-settings/:id - partial update.
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProfitLedgerSettingsDto: UpdateProfitLedgerSettingsDto,
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

        return this.profitLedgerSettingsService.updateProfitLedgerSettings(
            id,
            updateProfitLedgerSettingsDto,
            user?.userId,
            context,
        );
    }
}
