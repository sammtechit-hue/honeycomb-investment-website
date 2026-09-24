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
import { CreateInvestorBankAccountDto } from './dto/create-investor-bank-account.dto';
import { UpdateInvestorBankAccountDto } from './dto/update-investor-bank-account.dto';
import { InvestorBankAccountQueryDto } from './dto/query-investor-bank-account.dto';
import { InvestorBankAccountService } from './investor-bank-account.service';

// Investor bank account endpoints — an investor may hold several accounts, and
// the active one is what disbursements snapshot from. Validation is scoped to
// this controller (@UsePipes) instead of globally — see main.ts for why.
@Controller('investor-bank-account')
@UsePipes(ZodValidationPipe)
export class InvestorBankAccountController {
  constructor(private readonly investorBankAccountService: InvestorBankAccountService) {}

  // GET /api/investor-bank-account?search=city&investorId=&selectedBank=city_bank
  //   &accountType=savings&isActive=true&page=1&limit=10&sortBy=bankName&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestorBankAccountQueryDto) {
    // Search, filters, sort and pagination are validated by
    // InvestorBankAccountQueryDto.
    return this.investorBankAccountService.findAll(query);
  }

  // GET /api/investor-bank-account/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Return a single investor bank account data
    return this.investorBankAccountService.findOne(id);
  }

  // POST /api/investor-bank-account
  // isActive defaults to false; activating one account means deactivating the
  // investor's other accounts, which the service does.
  @Post()
  create(@Body() createInvestorBankAccountDto: CreateInvestorBankAccountDto) {
    return this.investorBankAccountService.create(createInvestorBankAccountDto);
  }

  // PATCH /api/investor-bank-account/:id
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestorBankAccountDto: UpdateInvestorBankAccountDto,
  ) {
    // Only the fields provided in the request
    // will be updated.

    return this.investorBankAccountService.update(id, updateInvestorBankAccountDto);
  }

  // DELETE /api/investor-bank-account/:id
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.investorBankAccountService.remove(id);
  }
}
