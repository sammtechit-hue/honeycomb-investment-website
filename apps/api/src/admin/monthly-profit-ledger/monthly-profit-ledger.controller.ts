import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
    UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { MonthlyProfitLedgerQueryDto } from './dto/query-monthly-profit-ledger.dto';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@investment-platform/db';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.interface';

@Controller('admin/monthly-profit-ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@UsePipes(ZodValidationPipe)
export class MonthlyProfitLedgerController {
    constructor(
        private readonly monthlyProfitLedgerService: MonthlyProfitLedgerService,
    ) { }


    @Get()
    findAll(@Query() query: MonthlyProfitLedgerQueryDto) {
        return this.monthlyProfitLedgerService.findAllMonthlyLedger(query);
    }

    // GET /admin/monthly-profit-ledger/:id
    @Get(':id')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: MonthlyProfitLedgerQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        // Return a single monthly profit ledger data
        return this.monthlyProfitLedgerService.findOneMonthlyLedger(id, user?.userId, query);
    }

    // POST /admin/monthly-profit-ledger
    @Post()
    create() {
        // Create a new monthly profit ledger record
        return this.monthlyProfitLedgerService.createMonthlyLedger();
    }
}