import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateMonthlyProfitLedgerDto } from './dto/create-monthly-profit-ledger.dto';
import { UpdateMonthlyProfitLedgerDto } from './dto/update-monthly-profit-ledger.dto';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';


@Controller('monthly-profit-ledger')
@UsePipes(ZodValidationPipe)
export class MonthlyProfitLedgerController {
    constructor(
        private readonly monthlyProfitLedgerService: MonthlyProfitLedgerService,
    ) {}


    // GET /admin/monthly-profit-ledger/:id
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        // Return a single monthly profit ledger data
        return this.monthlyProfitLedgerService.findOne(id);
    }

}
