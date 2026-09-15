import { Body, Controller, Get, Param, Post, Patch, Delete, Query } from '@nestjs/common';
import { CreateInvestorBankAccountDto } from './dto/create-investor-bank-account.dto';
import { UpdateInvestorBankAccountDto } from './dto/update-investor-bank-account.dto';
import { InvestorBankAccountService } from './investor-bank-account.service';

@Controller('investor-bank-account')
export class InvestorBankAccountController {
  constructor(private readonly investorBankAccountService: InvestorBankAccountService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // GET /investor-bank-account?search=cbl&status=active&category=savings&page=1&limit=10&sortBy=createdAt&sortOrder=desc
    return this.investorBankAccountService.findAll({
      search,
      status,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: sortOrder ?? 'desc',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Return a single investor bank account data
    return this.investorBankAccountService.findOne(id);
  }

  @Post()
  create(@Body() createInvestorBankAccountDto: CreateInvestorBankAccountDto) {
    return this.investorBankAccountService.create(createInvestorBankAccountDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInvestorBankAccountDto: UpdateInvestorBankAccountDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.investorBankAccountService.update(id, updateInvestorBankAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.investorBankAccountService.remove(id);
  }
}
