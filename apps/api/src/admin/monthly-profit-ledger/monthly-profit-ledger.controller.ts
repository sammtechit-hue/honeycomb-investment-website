import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
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
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single monthly profit ledger data
        return this.monthlyProfitLedgerService.findOneMonthlyLedger(id);
    }

    // POST /admin/monthly-profit-ledger
    @Post()
    create() {
        // Create a new monthly profit ledger record
        return this.monthlyProfitLedgerService.createMonthlyLedger();
    }
}