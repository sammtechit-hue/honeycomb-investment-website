import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { Role } from '@investment-platform/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';
import { MonthlyProfitLedgerQueryDto } from './dto/query-monthly-profit-ledger.dto';


@Controller('monthly-profit-ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INVESTOR)
@UsePipes(ZodValidationPipe)
export class MonthlyProfitLedgerController {
    constructor(
        private readonly monthlyProfitLedgerService: MonthlyProfitLedgerService,
    ) {}


    // GET /api/monthly-profit-ledger?investmentId=&payoutStatus=accrued
    //   &min=&max=&periodFrom=&periodTo=&page=1&limit=10&sortBy=periodMonth
    //   &sortOrder=desc
    @Get()
    findInvestorAllMonthlyProfitLedger(
        @Query() query: MonthlyProfitLedgerQueryDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.monthlyProfitLedgerService.findInvestorAllMonthlyProfitLedger(query, user?.userId);
    }

}
