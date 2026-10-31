import {
    Body,
    Controller,
    Get,
    Headers,
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
import { CreateMonthlyRateSettingDto } from './dto/create-monthly-rate-setting.dto';
import { UpdateMonthlyRateSettingDto } from './dto/update-monthly-rate-setting.dto';
import { MonthlyRateSettingQueryDto } from './dto/query-monthly-rate-setting.dto';
import { MonthlyRateSettingService } from './monthly-rate-setting.service';

// Admin endpoints for the per-month profit rate. A setting is addressed by
// month name + year (mapped to the unique @db.Date period_month column).
// Writes write an AuditLog entry (see the service) — the acting admin's
// identity and request context are forwarded to it.
@Controller('admin/monthly-rate-setting')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class MonthlyRateSettingController {
    constructor(
        private readonly monthlyRateSettingService: MonthlyRateSettingService,
    ) { }

    // GET /admin/monthly-rate-setting?status=active&page=1&limit=10&sortBy=periodMonth&sortOrder=desc
    @Get()
    findAll(@Query() query: MonthlyRateSettingQueryDto) {
        return this.monthlyRateSettingService.findAll(query);
    }

    // GET /admin/monthly-rate-setting/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.monthlyRateSettingService.findOne(id);
    }

    // POST /admin/monthly-rate-setting
    @Post()
    @Roles(Role.ADMIN)
    create(
        @Body() createMonthlyRateSettingDto: CreateMonthlyRateSettingDto,
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

        // user.userId is the User.id attached by JwtAuthGuard/JwtStrategy.
        return this.monthlyRateSettingService.createMonthlyRateSetting(
            createMonthlyRateSettingDto,
            user?.userId,
            context,
        );
    }

    // PATCH /admin/monthly-rate-setting/:id — only the fields provided in
    // the request will be updated.
    @Patch(':id')
    @Roles(Role.ADMIN)
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateMonthlyRateSettingDto: UpdateMonthlyRateSettingDto,
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

        return this.monthlyRateSettingService.updateMonthlyRateSetting(
            id,
            updateMonthlyRateSettingDto,
            user?.userId,
            context,
        );
    }
}
