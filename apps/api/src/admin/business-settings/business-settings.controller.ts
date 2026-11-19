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
import { CreateBusinessSettingsDto } from './dto/create-business-settings.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { BusinessSettingsQueryDto } from './dto/query-business-settings.dto';
import { BusinessSettingsService } from './business-settings.service';

// Admin endpoints for the global business settings (rate, ledger cycle day,
// counting start). Only one row is active at a time — writes write an
// AuditLog entry (see the service) and forward the acting admin + request context.
@Controller('admin/business-settings')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class BusinessSettingsController {
    constructor(private readonly businessSettingsService: BusinessSettingsService) { }

    // GET /admin/business-settings?search=&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: BusinessSettingsQueryDto) {
        return this.businessSettingsService.findAllBusinessSettings(query);
    }

    // GET /admin/business-settings/:id
    // BusinessSettings.id is an auto-increment Int (see schema.prisma).
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.businessSettingsService.findOneBusinessSettings(id);
    }

    // POST /admin/business-settings
    @Post()
    @Roles(Role.ADMIN)
    create(
        @Body() createBusinessSettingsDto: CreateBusinessSettingsDto,
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

        return this.businessSettingsService.createBusinessSettings(
            createBusinessSettingsDto,
            user?.userId,
            context,
        );
    }

    // PATCH /admin/business-settings/:id — only the fields provided in the
    // request will be updated.
    @Patch(':id')
    @Roles(Role.ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBusinessSettingsDto: UpdateBusinessSettingsDto,
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

        return this.businessSettingsService.updateBusinessSettings(
            id,
            updateBusinessSettingsDto,
            user?.userId,
            context,
        );
    }
}
