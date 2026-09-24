import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentQueryDto } from './dto/query-investment.dto';
import { InvestmentService } from './investment.service';

// Investor-facing investment endpoints (scoped to the logged-in investor).
@Controller('investment')
@UsePipes(ZodValidationPipe)
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  // GET /api/investment?search=&status=&investmentType=&page=1&limit=10&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(@Query() query: InvestmentQueryDto) {
    return this.investmentService.findAll(query);
  }

  // GET /api/investment/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.investmentService.findOne(id);
  }

  // POST /api/investment
  @Post()
  create(@Body() createInvestmentDto: CreateInvestmentDto) {
    return this.investmentService.create(createInvestmentDto);
  }

  // PATCH /api/investment/:id
  // Investors may only adjust investmentPeriodMonths and disbursementPeriod —
  // all other fields are rejected by investmentUpdateInputSchema.
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvestmentDto: UpdateInvestmentDto,
  ) {
    // Only the fields provided in the request
    // will be updated.
    return this.investmentService.update(id, updateInvestmentDto);
  }
}
