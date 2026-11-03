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
import { CreateFixedRateDto } from './dto/create-fixed-rate.dto';
import { UpdateFixedRateDto } from './dto/update-fixed-rate.dto';
import { FixedRateQueryDto } from './dto/query-fixed-rate.dto';
import { FixedRateService } from './fixed-rate.service';

@Controller('admin/fixed-rate')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class FixedRateController {
    constructor(private readonly fixedRateService: FixedRateService) {}

    // GET /api/admin/fixed-rate?search=&isActive=true&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: FixedRateQueryDto) {
        return this.fixedRateService.findAllFixedRate(query);
    }

    // GET /api/admin/fixed-rate/:id
    // Used to fetch one row (e.g. pre-filling the update form).
    // @Get(':id')
    // findOne(@Param('id', ParseIntPipe) id: number) {
    //     return this.fixedRateService.findOneFixedRate(id);
    // }

    // POST /admin/fixed-rate
    @Post()
    @Roles(Role.ADMIN)
    create(
        @Body() createFixedRateDto: CreateFixedRateDto,
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

        return this.fixedRateService.createFixedRate(
            createFixedRateDto,
            user?.userId,
            context,
        );
    }

    // PATCH /api/admin/fixed-rate/:id - partial update.
    // Admin-only (tighter than the class-level @Roles) like createFixedRate.
    @Patch(':id')
    @Roles(Role.ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateFixedRateDto: UpdateFixedRateDto,
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

        return this.fixedRateService.updateFixedRate(
            id,
            updateFixedRateDto,
            user?.userId,
            context,
        );
    }
}
