import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateMonthlyProfitLedgerDto } from './dto/create-monthly-profit-ledger.dto';
import { UpdateMonthlyProfitLedgerDto } from './dto/update-monthly-profit-ledger.dto';
import { MonthlyProfitLedgerService } from './monthly-profit-ledger.service';

@Controller('monthly-profit-ledger')
export class MonthlyProfitLedgerController {
  constructor(private readonly monthlyProfitLedgerService: MonthlyProfitLedgerService) { }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('min') min?: number,
    @Query('max') max?: number,
  ) {
    // GET /monthly-profit-ledger?search=investment_id&status=accrued&category=accrued&page=1&limit=10&sortBy=periodMonth&sortOrder=desc
    return this.monthlyProfitLedgerService.findAll({
      search,
      status,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single monthly profit ledger data
    return this.monthlyProfitLedgerService.findOne(id);
  }

  @Post()
  create(@Body() createMonthlyProfitLedgerDto: CreateMonthlyProfitLedgerDto) {
    return this.monthlyProfitLedgerService.create(createMonthlyProfitLedgerDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMonthlyProfitLedgerDto: UpdateMonthlyProfitLedgerDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.monthlyProfitLedgerService.update(id, updateMonthlyProfitLedgerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.monthlyProfitLedgerService.remove(id);
  }
}
