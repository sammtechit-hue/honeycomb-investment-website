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
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateMonthlyProfitLedgerDto } from './dto/create-monthly-profit-ledger.dto';
import { UpdateMonthlyProfitLedgerDto } from './dto/update-monthly-profit-ledger.dto';
import { MonthlyProfitLedgerQueryDto } from './dto/query-monthly-profit-ledger.dto';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';

// Admin endpoints for the monthly profit ledger — one row per investment per
// profit month, tracking the applied rate, computed profit and payout status.
// Validation is scoped to this controller (@UsePipes) instead of globally —
// see main.ts for why.
@Controller('admin/monthly-profit-ledger')
@UsePipes(ZodValidationPipe)
export class MonthlyProfitLedgerController {
    constructor(
        private readonly monthlyProfitLedgerService: MonthlyProfitLedgerService,
    ) {}

    // For getting all monthly profit ledger rows with filtering, searching,
    // sorting & pagination.
    // GET /api/admin/monthly-profit-ledger?search=&investmentId=&investorId=
    //   &payoutStatus=accrued&min=&max=&periodFrom=&periodTo=
    //   &page=1&limit=10&sortBy=periodMonth&sortOrder=desc
    @Get()
    findAll(@Query() query: MonthlyProfitLedgerQueryDto) {
        // Search, filters, amount/period ranges, sort and pagination are
        // validated by MonthlyProfitLedgerQueryDto.
        return this.monthlyProfitLedgerService.findAll(query);
    }

    // GET /admin/monthly-profit-ledger/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single monthly profit ledger data
        return this.monthlyProfitLedgerService.findOne(id);
    }

    // POST /admin/monthly-profit-ledger
    // payoutStatus defaults to "accrued".
    @Post()
    create(@Body() createMonthlyProfitLedgerDto: CreateMonthlyProfitLedgerDto) {
        // Create a new monthly profit ledger record
        return this.monthlyProfitLedgerService.create(createMonthlyProfitLedgerDto);
    }

    // PATCH /admin/monthly-profit-ledger/:id
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateMonthlyProfitLedgerDto: UpdateMonthlyProfitLedgerDto,
    ) {
        // Only the fields provided in the request
        // will be updated.

        return this.monthlyProfitLedgerService.update(id, updateMonthlyProfitLedgerDto);
    }

    // DELETE /admin/monthly-profit-ledger/:id
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        // Delete a monthly profit ledger by id
        return this.monthlyProfitLedgerService.remove(id);
    }
}
