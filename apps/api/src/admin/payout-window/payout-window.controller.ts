import {
    Body,
    Controller,
    Get,
    Headers,
    Ip,
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
import { CreatePayoutWindowDto } from './dto/create-payout-window.dto';
import { PayoutWindowQueryDto } from './dto/query-payout-window.dto';
import { PayoutWindowService } from './payout-window.service';

@Controller('admin/payout-window')
@UsePipes(ZodValidationPipe)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
export class PayoutWindowController {
    constructor(private readonly payoutWindowService: PayoutWindowService) {}

    // GET /api/admin/payout-window?status=open&periodFrom=2026-01-01&periodTo=2026-01-31&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    @Get()
    findAll(@Query() query: PayoutWindowQueryDto) {
        return this.payoutWindowService.findAllPayoutWindow(query);
    }

    // POST /api/admin/payout-window
    @Post()
    @Roles(Role.ADMIN)
    create(
        @Body() createPayoutWindowDto: CreatePayoutWindowDto,
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

        return this.payoutWindowService.createPayoutWindow(
            createPayoutWindowDto,
            user?.userId,
            context,
        );
    }
}
